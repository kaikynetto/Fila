from pathlib import Path
import re
import shutil

root = Path(__file__).resolve().parents[1]
dist = root / "Web" / "dist"
html = (dist / "index.html").read_text()

def script(match):
    code = (dist / match.group(1)).read_text().replace("</script", "<\\/script")
    return '<script type="module">' + code + '</script>'

def style(match):
    return '<style>' + (dist / match.group(1)).read_text() + '</style>'

html = re.sub(r'<script[^>]+src="\./([^"]+)"[^>]*></script>', script, html)
html = re.sub(r'<link[^>]+href="\./([^"]+\.css)"[^>]*>', style, html)
html = html.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" /><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; font-src data:; img-src data: fila-media:; media-src fila-media:;" />')
output = root / "Fila" / "Web"
output.mkdir(parents=True, exist_ok=True)
(output / "index.html").write_text(html)
examples = dist / "Examples"
if examples.exists():
    shutil.copytree(examples, output / "Examples", dirs_exist_ok=True)

notices = output / "Licenses"
notices.mkdir(exist_ok=True)
sources = {
    "Spell-UI-LICENSE.txt": root / "Web" / "third-party" / "Spell-UI-LICENSE.txt",
    "Geist-OFL.txt": root / "Web" / "node_modules" / "@fontsource-variable" / "geist" / "LICENSE",
    "Faustina-OFL.txt": root / "Web" / "node_modules" / "@fontsource" / "faustina" / "LICENSE",
    "Font-Awesome-LICENSE.txt": root / "Web" / "node_modules" / "@fortawesome" / "free-brands-svg-icons" / "LICENSE.txt",
}
for name, source in sources.items():
    shutil.copyfile(source, notices / name)
print("Interface local e fontes incorporadas ao app.")
