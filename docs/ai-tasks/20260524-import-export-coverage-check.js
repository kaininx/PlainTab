const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const indexUrl = 'file:///' + path.join(repoRoot, 'index.html').replace(/\\/g, '/');
const outputDir = path.join(repoRoot, 'output', 'playwright');
const importFile = path.join(outputDir, 'command-import-shortcuts.json');
const plainBackupFile = path.join(outputDir, 'plain-import-backup.json');
const encryptedBackupFile = path.join(outputDir, 'encrypted-import-backup.ptab');
const chromePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function deletePlainTabDb(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('PlainTab');
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error || new Error('deleteDatabase failed'));
    request.onblocked = () => resolve(false);
  }));
}

async function resetStorage(page) {
  await page.goto(indexUrl, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await deletePlainTabDb(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.WallpaperData && window.Palette);
}

async function verifySettingsBackup(page) {
  await resetStorage(page);
  const exported = await page.evaluate(async () => {
    const D = window.WallpaperData;
    D.saveLocale('zh-CN');

    const ui = D.loadUI();
    ui.search.visibility = 'always';
    ui.search.placeholder = 'PlainTab backup check';
    ui.appearance.radius = 'round';
    D.saveUI(ui);

    D.saveShortcutsModel({
      items: [{ id: 'normal-one', name: 'Normal One', url: 'https://example.com', freq: 7, added: 123 }],
      hidden: ['hidden-one'],
      recents: ['normal-one'],
      settings: Object.assign(D.defaultShortcutSettings(), {
        primaryHotkey: 'ctrl+alt+p',
        paletteSkin: 'command-terminal'
      })
    });
    D.saveShortcutIcons({
      'normal-one': 'LETTER:N',
      'hidden-one': 'LETTER:H'
    });

    const wallpaper = D.loadWallpaper();
    wallpaper.activeSource = 'upload';
    wallpaper.providers.upload.config.activeMedia = 'image';
    wallpaper.cache.order = ['upload_backup_probe'];
    wallpaper.cache.index = 0;
    wallpaper.cache.meta = {
      upload_backup_probe: { source: 'upload', name: 'probe.png', mime: 'image/png' }
    };
    D.saveWallpaper(wallpaper);
    D.saveThumbs({ upload_backup_probe: 'data:image/png;base64,thumb' });
    D.saveBlurThumbs({ upload_backup_probe: { blur: 5, thumb: 'data:image/png;base64,blurthumb' } });
    D.savePreview('data:image/png;base64,preview');
    await D.idbPut(D.imgKey('upload_backup_probe'), D.imageRecord(
      new Blob(['plain-tab-upload-payload'], { type: 'image/png' }),
      'probe.png'
    ));

    const payload = D.exportUserDataAsync ? await D.exportUserDataAsync() : D.exportUserData();
    return JSON.parse(JSON.stringify(payload));
  });

  await page.evaluate(async (payload) => {
    const D = window.WallpaperData;
    localStorage.clear();
    await D.idbDeleteMatching(() => true);
    if (D.importUserDataAsync) await D.importUserDataAsync(payload);
    else D.importUserData(payload);
  }, exported);

  const restored = await page.evaluate(async () => {
    const D = window.WallpaperData;
    const record = await D.idbGet(D.imgKey('upload_backup_probe'));
    const blobText = record && record.blob && record.blob.text ? await record.blob.text() : '';
    return {
      locale: D.loadLocale(),
      ui: D.loadUI(),
      wallpaper: D.loadWallpaper(),
      thumbs: D.loadThumbs(),
      blurThumbs: D.loadBlurThumbs(),
      preview: D.loadPreview(),
      shortcuts: D.loadShortcutsModel(),
      icons: D.loadShortcutIcons(),
      blobText
    };
  });

  assert(exported.data, 'settings backup should have a data section');
  assert(restored.locale === 'zh-CN', 'settings backup should restore locale');
  assert(restored.ui.search.placeholder === 'PlainTab backup check', 'settings backup should restore UI/search settings');
  assert(restored.wallpaper.activeSource === 'upload', 'settings backup should restore wallpaper model');
  assert(restored.thumbs.upload_backup_probe, 'settings backup should restore wallpaper thumbnails');
  assert(restored.blurThumbs.upload_backup_probe, 'settings backup should restore blur thumbnails');
  assert(restored.preview === 'data:image/png;base64,preview', 'settings backup should restore wallpaper preview');
  assert(restored.shortcuts.items.length === 1 && restored.shortcuts.settings.primaryHotkey === 'ctrl+alt+p', 'settings backup should restore shortcuts and command settings');
  assert(restored.icons['normal-one'] === 'LETTER:N', 'settings backup should restore shortcut icons');
  assert(restored.blobText === 'plain-tab-upload-payload', 'settings backup should restore IndexedDB wallpaper blobs before references');

  return {
    formatVersion: exported.formatVersion,
    dataKeys: Object.keys(exported.data).sort(),
    restoredBlobBytes: restored.blobText.length
  };
}

async function verifyFolderExcludedAndUploadOrphanKept(page) {
  await resetStorage(page);
  const exported = await page.evaluate(async () => {
    const D = window.WallpaperData;
    const wallpaper = D.loadWallpaper();
    wallpaper.activeSource = 'folder';
    wallpaper.providers.folder.config = D.normalizeFolderConfig({
      pathLabel: 'Pictures',
      strategy: 'shuffle'
    });
    wallpaper.providers.folder.state = D.normalizeFolderState({
      status: 'ready',
      indexedCount: 1,
      currentName: 'folder-photo.jpg'
    });
    wallpaper.cache.order = ['folder:folder-photo.jpg'];
    wallpaper.cache.index = 0;
    wallpaper.cache.meta = {
      'folder:folder-photo.jpg': { source: 'folder', name: 'folder-photo.jpg' }
    };
    D.saveWallpaper(wallpaper);
    D.saveThumbs({ 'folder:folder-photo.jpg': 'data:image/png;base64,folderthumb' });
    D.saveBlurThumbs({ 'folder:folder-photo.jpg': { blur: 5, thumb: 'data:image/png;base64,folderblur' } });
    D.savePreview('data:image/png;base64,folderpreview');
    await D.idbPut(D.DB.FOLDER_HANDLE, { fakeHandle: true });
    await D.idbPut(D.DB.FOLDER_FILES, [{ name: 'folder-photo.jpg', id: 'folder:folder-photo.jpg' }]);
    await D.idbPut(D.folderLightKey('folder-photo.jpg'), {
      blob: new Blob(['folder-light-cache'], { type: 'image/png' }),
      name: 'folder-photo.jpg'
    });
    await D.idbPut(D.imgKey('upload_orphan'), D.imageRecord(
      new Blob(['orphan-upload-payload'], { type: 'image/png' }),
      'orphan.png'
    ));
    return D.exportUserDataAsync ? D.exportUserDataAsync() : D.exportUserData();
  });

  const keys = (((exported.data || {}).indexedDb || {}).records || []).map((record) => record.key).sort();
  assert(!keys.some((key) => String(key).indexOf('ptab_wallpaper_folder_') === 0), 'settings backup should not export folder IndexedDB records');
  assert(keys.includes('ptab_wallpaper_blob_upload_orphan'), 'settings backup should keep orphan upload blobs');
  assert(exported.data.wallpaper.activeSource !== 'folder', 'settings backup should not restore folder as active wallpaper');
  assert(!exported.data.wallpaper.cache.order.some((id) => String(id).indexOf('folder:') === 0), 'settings backup should not export folder cache order references');
  assert(!exported.data.wallpaper.cache.meta['folder:folder-photo.jpg'], 'settings backup should not export folder cache metadata');
  assert(!exported.data.wallpaperThumbs['folder:folder-photo.jpg'], 'settings backup should not export folder thumbnails');
  assert(!exported.data.wallpaperBlurThumbs['folder:folder-photo.jpg'], 'settings backup should not export folder blur thumbnails');

  return {
    activeSource: exported.data.wallpaper.activeSource,
    indexedDbKeys: keys
  };
}

async function openDataSettingsTab(page) {
  await page.evaluate(() => window.SettingsPanelFull.openModal());
  await page.locator('.modal-tab[data-tab="data"]').click();
  await page.waitForSelector('#dataImportChooseBtn');
}

async function chooseDataImportFile(page, filePath) {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('#dataImportChooseBtn').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(filePath);
}

async function dataImportControlState(page) {
  return page.evaluate(() => {
    const pass = document.getElementById('dataImportPass');
    const toggle = document.getElementById('dataImportPassToggle');
    return {
      fileName: document.getElementById('dataImportFileName').textContent,
      importDisabled: document.getElementById('dataImportRunBtn').disabled,
      passDisabled: pass.disabled,
      passType: pass.type,
      passValue: pass.value,
      hasToggle: !!toggle,
      toggleDisabled: toggle ? toggle.disabled : true,
      togglePressed: toggle ? toggle.getAttribute('aria-pressed') : '',
      toggleText: toggle ? toggle.textContent.trim() : ''
    };
  });
}

async function dataExportPassState(page) {
  return page.evaluate(() => {
    const pass = document.getElementById('dataExportPass');
    const toggle = document.getElementById('dataExportPassToggle');
    return {
      passDisabled: pass.disabled,
      passType: pass.type,
      passValue: pass.value,
      hasToggle: !!toggle,
      toggleDisabled: toggle ? toggle.disabled : true,
      togglePressed: toggle ? toggle.getAttribute('aria-pressed') : '',
      toggleText: toggle ? toggle.textContent.trim() : ''
    };
  });
}

async function verifyDataImportControls(page) {
  await resetStorage(page);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(plainBackupFile, JSON.stringify({
    app: 'PlainTab',
    format: 'plaintab-user-config',
    formatVersion: 2,
    data: { ui: {} }
  }, null, 2));
  fs.writeFileSync(encryptedBackupFile, JSON.stringify({
    app: 'PlainTab',
    format: 'plaintab-user-config',
    formatVersion: 2,
    encrypted: true,
    data: 'placeholder'
  }, null, 2));

  await openDataSettingsTab(page);
  let exportState = await dataExportPassState(page);
  assert(exportState.hasToggle, 'data export passphrase visibility toggle should exist');
  assert(!exportState.passDisabled && !exportState.toggleDisabled, 'data export passphrase visibility should be available');
  assert(exportState.passType === 'password' && exportState.togglePressed === 'false', 'data export passphrase should start hidden');
  assert(exportState.toggleText === '', 'data export passphrase visibility toggle should be icon-only');
  await page.locator('#dataExportPass').fill('export-secret');
  await page.locator('#dataExportPassToggle').click();
  exportState = await dataExportPassState(page);
  assert(exportState.passType === 'text' && exportState.passValue === 'export-secret' && exportState.togglePressed === 'true', 'data export passphrase visibility toggle should reveal the passphrase');
  await page.locator('#dataExportPassToggle').click();
  exportState = await dataExportPassState(page);
  assert(exportState.passType === 'password' && exportState.togglePressed === 'false', 'data export passphrase visibility toggle should hide the passphrase again');

  let state = await dataImportControlState(page);
  assert(state.hasToggle, 'data import passphrase visibility toggle should exist');
  assert(state.toggleText === '', 'data import passphrase visibility toggle should be icon-only');
  assert(state.importDisabled, 'data import should be disabled before a file is selected');
  assert(state.passDisabled, 'data import passphrase should be disabled before a file is selected');
  assert(state.toggleDisabled, 'data import passphrase visibility should be disabled before a file is selected');

  await chooseDataImportFile(page, plainBackupFile);
  state = await dataImportControlState(page);
  assert(state.fileName === 'plain-import-backup.json', 'data import should show the selected JSON filename');
  assert(!state.importDisabled, 'data import should be enabled after choosing a JSON backup');
  assert(state.passDisabled, 'data import passphrase should stay disabled for JSON backups');
  assert(state.toggleDisabled, 'data import passphrase visibility should stay disabled for JSON backups');

  await chooseDataImportFile(page, encryptedBackupFile);
  state = await dataImportControlState(page);
  assert(state.fileName === 'encrypted-import-backup.ptab', 'data import should show the selected PTAB filename');
  assert(!state.importDisabled, 'data import should be enabled after choosing a PTAB backup');
  assert(!state.passDisabled, 'data import passphrase should be enabled only for PTAB backups');
  assert(!state.toggleDisabled, 'data import passphrase visibility should be enabled for PTAB backups');
  assert(state.passType === 'password' && state.togglePressed === 'false', 'data import passphrase should start hidden for PTAB backups');
  assert(state.toggleText === '', 'data import passphrase visibility toggle should remain icon-only');

  await page.locator('#dataImportPass').fill('secret-pass');
  await page.locator('#dataImportPassToggle').click();
  state = await dataImportControlState(page);
  assert(state.passType === 'text' && state.passValue === 'secret-pass' && state.togglePressed === 'true', 'data import passphrase visibility toggle should reveal the passphrase');
  await page.locator('#dataImportPassToggle').click();
  state = await dataImportControlState(page);
  assert(state.passType === 'password' && state.togglePressed === 'false', 'data import passphrase visibility toggle should hide the passphrase again');

  return {
    exportPassToggleWorks: true,
    jsonImportEnabled: true,
    ptabPassEnabled: true,
    passToggleWorks: true
  };
}

async function verifyCommandPaletteImportExport(page) {
  await page.evaluate(() => {
    const D = window.WallpaperData;
    D.saveShortcutsModel({
      items: [
        { id: 'normal-export', name: 'Normal Export', url: 'https://normal.example', freq: 2, added: 111 },
        { id: 'hidden-export', name: 'Hidden Export', url: 'https://hidden.example', freq: 4, added: 222 }
      ],
      hidden: ['hidden-export'],
      recents: [],
      settings: Object.assign(D.defaultShortcutSettings(), { paletteSkin: 'command-terminal' })
    });
    D.saveShortcutIcons({});
    window.Palette.savePaletteSkin('command-terminal');
    window.Palette.refresh();
  });

  await page.evaluate(() => window.Palette.open());
  await page.locator('#cpSearchInput').fill('export');
  const normalDownloadPromise = page.waitForEvent('download');
  await page.locator('#cpSearchInput').press('Enter');
  const normalDownload = await normalDownloadPromise;
  const normalExport = JSON.parse(fs.readFileSync(await normalDownload.path(), 'utf8'));
  assert(normalExport.type === 'plaintab-command-shortcuts', 'command export should use the shortcut export type');
  assert(normalExport.scope === 'normal', 'normal command export should be scoped to the normal palette');
  assert(normalExport.items.length === 1 && normalExport.items[0].url === 'https://normal.example', 'normal command export should include only normal shortcuts');

  await page.evaluate(() => {
    window.Palette.close();
    window.Palette.openHidden();
  });
  await page.locator('#cpSearchInput').fill('export');
  const hiddenDownloadPromise = page.waitForEvent('download');
  await page.locator('#cpSearchInput').press('Enter');
  const hiddenDownload = await hiddenDownloadPromise;
  const hiddenExport = JSON.parse(fs.readFileSync(await hiddenDownload.path(), 'utf8'));
  assert(hiddenExport.scope === 'hidden', 'hidden command export should be scoped to the hidden palette');
  assert(hiddenExport.items.length === 1 && hiddenExport.items[0].url === 'https://hidden.example', 'hidden command export should include only hidden shortcuts');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(importFile, JSON.stringify({
    type: 'plaintab-command-shortcuts',
    version: 1,
    scope: 'normal',
    items: [
      { name: 'Imported Normal', url: 'https://imported.example', freq: 3, added: 333 },
      { name: 'Hidden Export', url: 'https://hidden.example', freq: 4, added: 222 }
    ]
  }, null, 2));

  await page.evaluate(() => {
    const D = window.WallpaperData;
    D.saveShortcutsModel({
      items: [{ id: 'hidden-export', name: 'Hidden Export', url: 'https://hidden.example', freq: 4, added: 222 }],
      hidden: ['hidden-export'],
      recents: [],
      settings: Object.assign(D.defaultShortcutSettings(), { paletteSkin: 'command-terminal' })
    });
    window.Palette.refresh();
    window.Palette.close();
    window.Palette.open();
  });
  await page.locator('#cpSearchInput').fill('import');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('#cpSearchInput').press('Enter');
  const chooser = await chooserPromise;
  await chooser.setFiles(importFile);
  await page.waitForFunction(() => {
    const model = window.WallpaperData.loadShortcutsModel();
    return model.items.some((item) => item.url === 'https://imported.example') &&
      !model.hidden.includes(model.items.find((item) => item.url === 'https://hidden.example').id);
  });

  const imported = await page.evaluate(() => window.WallpaperData.loadShortcutsModel());
  return {
    normalExportCount: normalExport.items.length,
    hiddenExportCount: hiddenExport.items.length,
    importedCount: imported.items.length,
    hiddenCountAfterImport: imported.hidden.length
  };
}

(async () => {
  const launchOptions = fs.existsSync(chromePath) ? { executablePath: chromePath } : {};
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  try {
    const settings = await verifySettingsBackup(page);
    const folderPolicy = await verifyFolderExcludedAndUploadOrphanKept(page);
    const dataImportControls = await verifyDataImportControls(page);
    const commandPalette = await verifyCommandPaletteImportExport(page);
    console.log(JSON.stringify({ ok: true, settings, folderPolicy, dataImportControls, commandPalette }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
