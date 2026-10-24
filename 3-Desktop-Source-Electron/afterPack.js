// Embed icon + version info into the Windows exe without Wine (pure JS via resedit)
const fs = require('fs'), path = require('path');
exports.default = async function (ctx) {
  if (ctx.electronPlatformName !== 'win32') return;
  const ResEdit = require('resedit');
  const exe = path.join(ctx.appOutDir, ctx.packager.appInfo.productFilename + '.exe');
  const data = fs.readFileSync(exe);
  const pe = ResEdit.NtExecutable.from(data, { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(pe);
  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'build', 'icon.ico')));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const gid = groups.length ? groups[0].id : 1, lang = groups.length ? groups[0].lang : 1033;
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, gid, lang, ico.icons.map(i => i.data));
  const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
  if (vi) {
    vi.setStringValues({ lang: 1033, codepage: 1200 }, { ProductName: 'DanaFox', FileDescription: 'DanaFox - English Vocabulary Trainer', CompanyName: 'DanaFox', LegalCopyright: 'DanaFox', OriginalFilename: 'DanaFox.exe', InternalName: 'DanaFox' });
    const [a, b, c] = String(ctx.packager.appInfo.version || '1.0.0').split('.').map(n => parseInt(n, 10) || 0);
    vi.setFileVersion(a, b, c, 0, 1033); vi.setProductVersion(a, b, c, 0, 1033);
    vi.outputToResourceEntries(res.entries);
  }
  res.outputResource(pe);
  fs.writeFileSync(exe, Buffer.from(pe.generate()));
  console.log('  • icon & version info embedded:', exe);
};
