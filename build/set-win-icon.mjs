// Embed the icon and version info into FrameDeck.exe without needing Wine.
import * as ResEdit from 'resedit';
import fs from 'fs';
const [exe, ico, version] = process.argv.slice(2);
const data = fs.readFileSync(exe);
const res = ResEdit.NtExecutableResource.from(ResEdit.NtExecutable.from(data, { ignoreCert: true }));
const exeObj = ResEdit.NtExecutable.from(data, { ignoreCert: true });
const resource = ResEdit.NtExecutableResource.from(exeObj);
const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(ico));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(resource.entries);
const groupId = groups.length ? groups[0].id : 1;
const lang = groups.length ? groups[0].lang : 1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(resource.entries, groupId, lang, iconFile.icons.map((i) => i.data));
const vi = ResEdit.Resource.VersionInfo.fromEntries(resource.entries)[0];
if (vi) {
  const [a, b, c] = version.split('.').map(Number);
  vi.setFileVersion(a, b, c, 0, 1033); vi.setProductVersion(a, b, c, 0, 1033);
  vi.setStringValues({ lang: 1033, codepage: 1200 }, { ProductName: 'FrameDeck', FileDescription: 'FrameDeck', CompanyName: 'Kai-Tung Yu', ProductVersion: version, FileVersion: version, OriginalFilename: 'FrameDeck.exe', LegalCopyright: 'Copyright © 2026 Kai-Tung Yu' });
  vi.outputToResourceEntries(resource.entries);
}
resource.outputResource(exeObj);
fs.writeFileSync(exe, Buffer.from(exeObj.generate()));
console.log('icon set on', exe);
