#!/usr/bin/env python3
"""生成最新 tag 版本的项目 zip 包。在 EXCLUDE_* 常量中维护排除规则。"""

import subprocess
import zipfile
import io
import os
import sys

# ============================================================
# 排除规则 — 在此处添加/删除规则
# ============================================================

# 排除的目录前缀（相对项目根）
EXCLUDE_DIRS = [
    'docs/',
    'imgs/',
    'wasm/',
]

# 排除的文件后缀
EXCLUDE_SUFFIXES = [
    '.md',
    '.py',
]

# 排除的特定文件名（包含匹配）
EXCLUDE_FILES = [
    '.gitattributes',
]

# 是否排除所有 dotfile（以 . 开头的文件/目录）
EXCLUDE_DOTFILES = True

# ============================================================

def get_latest_tag():
    """获取按版本排序的最新 git tag。"""
    try:
        output = subprocess.check_output(
            ['git', 'tag', '--sort=-version:refname'],
            text=True
        )
        tags = [t.strip() for t in output.split('\n') if t.strip()]
        if not tags:
            sys.exit('错误：仓库中没有 tag')
        return tags[0]
    except subprocess.CalledProcessError as e:
        sys.exit(f'错误：获取 tag 失败 — {e}')

def should_exclude(path):
    """返回 True 表示该文件应从 zip 中排除。"""
    if EXCLUDE_DOTFILES:
        parts = path.split('/')
        for p in parts:
            if p.startswith('.'):
                return True

    if path.startswith(tuple(EXCLUDE_DIRS)):
        return True

    if any(path.endswith(suffix) for suffix in EXCLUDE_SUFFIXES):
        return True

    if any(name in path for name in EXCLUDE_FILES):
        return True

    return False

def build_zip(tag, output_name):
    """从指定 tag 生成过滤后的 zip 包。"""
    # 通过 git archive 获取完整 zip
    archive_data = subprocess.check_output(
        ['git', 'archive', '--format=zip', '--prefix', f'PlainTab-{tag}/', tag]
    )

    input_zip = zipfile.ZipFile(io.BytesIO(archive_data))
    output_zip = zipfile.ZipFile(output_name, 'w', zipfile.ZIP_DEFLATED)

    kept, skipped = 0, 0

    for item in input_zip.infolist():
        # 去掉 --prefix 得到相对于项目根的路径
        rel_path = item.filename.removeprefix(f'PlainTab-{tag}/')

        if should_exclude(rel_path):
            skipped += 1
            continue

        # 保留原始路径（含 prefix），保持解压后目录结构
        output_zip.writestr(item, input_zip.read(item.filename))
        kept += 1

    input_zip.close()
    output_zip.close()

    print(f'最新 tag: {tag}')
    print(f'包含 {kept} 个文件，排除 {skipped} 个文件')
    print(f'已生成: {output_name}')

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    os.makedirs('release', exist_ok=True)
    tag = get_latest_tag()
    output_name = os.path.join('release', f'PlainTab-{tag}.zip')
    build_zip(tag, output_name)
