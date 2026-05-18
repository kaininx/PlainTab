#include <stdint.h>

namespace {

const int kMaxPixels = 128 * 128;
const int kChannels = 4;
const int kBins = 16 * 16 * 16;
const int kTopLimit = 32;
const int kResultHeader = 27;
const int kResultInts = kResultHeader + kTopLimit * 4;
const int kInvalidScore = -1000000;
const int kAbiVersion = 2;

enum ResultOffset {
    kOffsetAccepted = 0,
    kOffsetAverageLuminance = 1,
    kOffsetDominant = 2,
    kOffsetMood = 6,
    kOffsetVibrant = 10,
    kOffsetMuted = 14,
    kOffsetDark = 18,
    kOffsetLight = 22,
    kOffsetTopCount = 26
};

uint8_t g_pixels[kMaxPixels * kChannels];
int32_t g_result[kResultInts];
uint32_t g_weight[kBins];
uint32_t g_sum_r[kBins];
uint32_t g_sum_g[kBins];
uint32_t g_sum_b[kBins];
int32_t g_touched[kBins];
int g_touched_count = 0;

int abs_int(int v) {
    return v < 0 ? -v : v;
}

int min_int(int a, int b) {
    return a < b ? a : b;
}

int max_int(int a, int b) {
    return a > b ? a : b;
}

int clamp_int(int v, int lo, int hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}

int lum(int r, int g, int b) {
    return (77 * r + 150 * g + 29 * b) >> 8;
}

int saturation255(int r, int g, int b) {
    int hi = max_int(r, max_int(g, b));
    int lo = min_int(r, min_int(g, b));
    if (hi <= 0) return 0;
    return ((hi - lo) * 255) / hi;
}

int bin_r(int bin) {
    return (((bin >> 8) & 15) << 4) + 8;
}

int bin_g(int bin) {
    return (((bin >> 4) & 15) << 4) + 8;
}

int bin_b(int bin) {
    return ((bin & 15) << 4) + 8;
}

void clear_result() {
    for (int i = 0; i < kResultInts; ++i) {
        g_result[i] = 0;
    }
}

void clear_bins() {
    for (int i = 0; i < g_touched_count; ++i) {
        int bin = g_touched[i];
        g_weight[bin] = 0;
        g_sum_r[bin] = 0;
        g_sum_g[bin] = 0;
        g_sum_b[bin] = 0;
    }
    g_touched_count = 0;
}

int avg_bin_r(int bin) {
    return g_weight[bin] ? static_cast<int>(g_sum_r[bin] / g_weight[bin]) : bin_r(bin);
}

int avg_bin_g(int bin) {
    return g_weight[bin] ? static_cast<int>(g_sum_g[bin] / g_weight[bin]) : bin_g(bin);
}

int avg_bin_b(int bin) {
    return g_weight[bin] ? static_cast<int>(g_sum_b[bin] / g_weight[bin]) : bin_b(bin);
}

void write_color(int offset, int bin, int count) {
    if (bin < 0 || count <= 0) {
        g_result[offset] = 0;
        g_result[offset + 1] = 0;
        g_result[offset + 2] = 0;
        g_result[offset + 3] = 0;
        return;
    }
    g_result[offset] = avg_bin_r(bin);
    g_result[offset + 1] = avg_bin_g(bin);
    g_result[offset + 2] = avg_bin_b(bin);
    g_result[offset + 3] = count;
}

void write_rgb_color(int offset, int r, int g, int b, int count) {
    g_result[offset] = clamp_int(r, 0, 255);
    g_result[offset + 1] = clamp_int(g, 0, 255);
    g_result[offset + 2] = clamp_int(b, 0, 255);
    g_result[offset + 3] = count;
}

void insert_top(int bin, int count, int* top_bins, int* top_counts, int limit) {
    if (count <= 0) return;
    int pos = limit;
    for (int i = 0; i < limit; ++i) {
        if (count > top_counts[i]) {
            pos = i;
            break;
        }
    }
    if (pos >= limit) return;
    for (int i = limit - 1; i > pos; --i) {
        top_bins[i] = top_bins[i - 1];
        top_counts[i] = top_counts[i - 1];
    }
    top_bins[pos] = bin;
    top_counts[pos] = count;
}

int score_vibrant(int bin, int count) {
    int r = avg_bin_r(bin);
    int g = avg_bin_g(bin);
    int b = avg_bin_b(bin);
    int l = lum(r, g, b);
    int sat = saturation255(r, g, b);
    if (sat < 48 || l < 36 || l > 224) return kInvalidScore;
    int presence = count / 96;
    if (presence > 160) presence = 160;
    return sat * 12 + presence * 10 - abs_int(l - 132) * 4;
}

int score_muted(int bin, int count) {
    int r = avg_bin_r(bin);
    int g = avg_bin_g(bin);
    int b = avg_bin_b(bin);
    int l = lum(r, g, b);
    int sat = saturation255(r, g, b);
    if (sat < 24 || sat > 154 || l < 48 || l > 208) return kInvalidScore;
    int presence = count / 96;
    if (presence > 160) presence = 160;
    return presence * 9 + (154 - abs_int(sat - 82)) * 4 - abs_int(l - 126) * 2;
}

int score_dark(int bin, int count) {
    int r = avg_bin_r(bin);
    int g = avg_bin_g(bin);
    int b = avg_bin_b(bin);
    int l = lum(r, g, b);
    if (l > 112) return kInvalidScore;
    int presence = count / 96;
    if (presence > 160) presence = 160;
    return presence * 10 + saturation255(r, g, b) * 2 - abs_int(l - 56) * 2;
}

int score_light(int bin, int count) {
    int r = avg_bin_r(bin);
    int g = avg_bin_g(bin);
    int b = avg_bin_b(bin);
    int l = lum(r, g, b);
    if (l < 146) return kInvalidScore;
    int presence = count / 96;
    if (presence > 160) presence = 160;
    return presence * 10 + saturation255(r, g, b) * 2 - abs_int(l - 196) * 2;
}

void update_best(int score, int bin, int count, int* best_score, int* best_bin, int* best_count) {
    if (score <= kInvalidScore || score <= *best_score) return;
    *best_score = score;
    *best_bin = bin;
    *best_count = count;
}

void choose_candidates(int* vibrant_bin, int* vibrant_count,
                       int* muted_bin, int* muted_count,
                       int* dark_bin, int* dark_count,
                       int* light_bin, int* light_count) {
    int vibrant_score = kInvalidScore;
    int muted_score = kInvalidScore;
    int dark_score = kInvalidScore;
    int light_score = kInvalidScore;
    *vibrant_bin = *muted_bin = *dark_bin = *light_bin = -1;
    *vibrant_count = *muted_count = *dark_count = *light_count = 0;

    for (int i = 0; i < g_touched_count; ++i) {
        int bin = g_touched[i];
        int count = static_cast<int>(g_weight[bin]);
        update_best(score_vibrant(bin, count), bin, count, &vibrant_score, vibrant_bin, vibrant_count);
        update_best(score_muted(bin, count), bin, count, &muted_score, muted_bin, muted_count);
        update_best(score_dark(bin, count), bin, count, &dark_score, dark_bin, dark_count);
        update_best(score_light(bin, count), bin, count, &light_score, light_bin, light_count);
    }
}

int spatial_weight(int x, int y, int width, int height) {
    if (width <= 1 || height <= 1) return 128;
    int dx = abs_int(2 * x + 1 - width);
    int dy = abs_int(2 * y + 1 - height);
    int nx = (dx * 128) / width;
    int ny = (dy * 128) / height;
    int distance = (nx + ny) / 2;
    return clamp_int(160 - distance / 2, 96, 160);
}

int color_weight(int r, int g, int b, int l) {
    int sat = saturation255(r, g, b);
    int weight = 128 + min_int(sat, 192) / 6;

    if (sat < 12) weight -= 16;
    if (l < 20) weight -= (20 - l);
    if (l > 238) weight -= (l - 238) * 2;
    if (l > 224 && sat < 28) weight -= 24;
    if (l < 32 && sat < 32) weight -= 20;

    return clamp_int(weight, 64, 192);
}

} // namespace

extern "C" {

uint8_t* theme_input_buffer() {
    return g_pixels;
}

int32_t* theme_result_buffer() {
    return g_result;
}

int theme_max_pixels() {
    return kMaxPixels;
}

int theme_result_ints() {
    return kResultInts;
}

int theme_abi_version() {
    return kAbiVersion;
}

int theme_analyze(int width, int height, int color_limit) {
    clear_result();
    clear_bins();

    width = clamp_int(width, 1, 128);
    height = clamp_int(height, 1, 128);
    color_limit = clamp_int(color_limit, 1, kTopLimit);

    int pixel_count = width * height;
    uint64_t total_l = 0;
    uint64_t total_weight = 0;
    int accepted = 0;

    for (int i = 0; i < pixel_count && i < kMaxPixels; ++i) {
        int p = i * kChannels;
        int a = g_pixels[p + 3];
        if (a < 128) continue;

        int r = g_pixels[p];
        int g = g_pixels[p + 1];
        int b = g_pixels[p + 2];
        int l = lum(r, g, b);

        int x = i % width;
        int y = i / width;
        int weight = (spatial_weight(x, y, width, height) * color_weight(r, g, b, l) + 64) / 128;
        if (a < 255) weight = (weight * a) / 255;
        if (weight <= 0) continue;

        int qr = r >> 4;
        int qg = g >> 4;
        int qb = b >> 4;
        int bin = (qr << 8) | (qg << 4) | qb;

        if (g_weight[bin] == 0 && g_touched_count < kBins) {
            g_touched[g_touched_count++] = bin;
        }
        g_weight[bin] += static_cast<uint32_t>(weight);
        g_sum_r[bin] += static_cast<uint32_t>(r * weight);
        g_sum_g[bin] += static_cast<uint32_t>(g * weight);
        g_sum_b[bin] += static_cast<uint32_t>(b * weight);
        total_l += static_cast<uint64_t>(l * weight);
        total_weight += static_cast<uint64_t>(weight);
        accepted++;
    }

    if (accepted <= 0 || total_weight == 0) {
        return 0;
    }

    int top_bins[kTopLimit];
    int top_counts[kTopLimit];
    for (int i = 0; i < kTopLimit; ++i) {
        top_bins[i] = -1;
        top_counts[i] = 0;
    }

    for (int i = 0; i < g_touched_count; ++i) {
        int bin = g_touched[i];
        insert_top(bin, static_cast<int>(g_weight[bin]), top_bins, top_counts, color_limit);
    }

    int top_count = 0;
    for (int i = 0; i < color_limit; ++i) {
        if (top_bins[i] >= 0 && top_counts[i] > 0) top_count++;
    }
    if (top_count <= 0) {
        return 0;
    }

    g_result[kOffsetAccepted] = accepted;
    g_result[kOffsetAverageLuminance] = static_cast<int32_t>(total_l / total_weight);
    write_color(kOffsetDominant, top_bins[0], top_counts[0]);

    int mood_limit = top_count < 16 ? top_count : 16;
    int mood_weight = 0;
    int mood_r = 0;
    int mood_g = 0;
    int mood_b = 0;
    for (int i = 0; i < mood_limit; ++i) {
        int w = top_counts[i];
        mood_weight += w;
        mood_r += avg_bin_r(top_bins[i]) * w;
        mood_g += avg_bin_g(top_bins[i]) * w;
        mood_b += avg_bin_b(top_bins[i]) * w;
    }
    if (mood_weight > 0) {
        write_rgb_color(kOffsetMood, mood_r / mood_weight, mood_g / mood_weight, mood_b / mood_weight, mood_weight);
    }

    int vibrant_bin = -1, vibrant_count = 0;
    int muted_bin = -1, muted_count = 0;
    int dark_bin = -1, dark_count = 0;
    int light_bin = -1, light_count = 0;
    choose_candidates(&vibrant_bin, &vibrant_count,
                      &muted_bin, &muted_count,
                      &dark_bin, &dark_count,
                      &light_bin, &light_count);
    write_color(kOffsetVibrant, vibrant_bin, vibrant_count);
    write_color(kOffsetMuted, muted_bin, muted_count);
    write_color(kOffsetDark, dark_bin, dark_count);
    write_color(kOffsetLight, light_bin, light_count);

    g_result[kOffsetTopCount] = top_count;
    for (int i = 0; i < top_count; ++i) {
        write_color(kResultHeader + i * 4, top_bins[i], top_counts[i]);
    }

    return accepted;
}

}
