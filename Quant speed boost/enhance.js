const fs = require('fs');
const path = require('path');
const sass = require('sass');

// Compile styles.scss
console.log('Compiling styles.scss...');
const result = sass.compile('styles.scss');
const css = result.css;
console.log('SCSS compiled successfully!');

// Define the Google fonts HTML snippet to inject
const fontSnippet = `    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">`;

// Read directory
const dirPath = __dirname;
const files = fs.readdirSync(dirPath);
const htmlFiles = files.filter(f => f.endsWith('.html'));

console.log(`Found ${htmlFiles.length} HTML files to update.`);

for (const file of htmlFiles) {
    const filePath = path.join(dirPath, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Normalize Windows line endings to simplify matching
    content = content.replace(/\r\n/g, '\n');

    // 1. Inject/Replace Style block
    const startStyleTag = '<style>';
    const endStyleTag = '</style>';
    const startStyleIdx = content.indexOf(startStyleTag);
    const endStyleIdx = content.indexOf(endStyleTag, startStyleIdx);

    if (startStyleIdx === -1 || endStyleIdx === -1) {
        console.warn(`Could not find <style> block in ${file}. Skipping.`);
        continue;
    }

    // 2. Add google font links in <head> if not present
    if (!content.includes('fonts.googleapis.com/css2?family=Outfit')) {
        const headTag = '<head>';
        const headIdx = content.indexOf(headTag);
        if (headIdx !== -1) {
            const insertPos = headIdx + headTag.length;
            content = content.substring(0, insertPos) + '\n' + fontSnippet + content.substring(insertPos);
        }
    }

    // Recalculate style indexes as content length changed
    const newStartStyleIdx = content.indexOf(startStyleTag);
    const newEndStyleIdx = content.indexOf(endStyleTag, newStartStyleIdx);

    let updatedContent = 
        content.substring(0, newStartStyleIdx + startStyleTag.length) + 
        '\n' + css + '\n' + 
        content.substring(newEndStyleIdx);

    // 3. Inject Fullscreen button in HTML header
    if (!updatedContent.includes('id="fullscreenBtn"')) {
        const timerTag = '<div class="exam-timer">';
        const timerTagIdx = updatedContent.indexOf(timerTag);
        if (timerTagIdx !== -1) {
            const insertPos = timerTagIdx + timerTag.length;
            const btnHtml = `\n                <button class="fullscreen-btn" id="fullscreenBtn" title="Toggle Fullscreen">\n                    <i class="fas fa-expand"></i>\n                </button>`;
            updatedContent = updatedContent.substring(0, insertPos) + btnHtml + updatedContent.substring(insertPos);
        }
    }

    // 4. Inject fullscreenBtn initialization in initElements()
    if (!updatedContent.includes("fullscreenBtn: document.getElementById('fullscreenBtn')")) {
        const initRegex = /(initElements\(\)\s*\{\s*this\.els\s*=\s*\{)/;
        const match = updatedContent.match(initRegex);
        if (match) {
            const insertPos = match.index + match[0].length;
            const initJs = `\n                    fullscreenBtn: document.getElementById('fullscreenBtn'),`;
            updatedContent = updatedContent.substring(0, insertPos) + initJs + updatedContent.substring(insertPos);
        }
    }

    // 5. Inject event listeners in setupWelcomeScreen()
    if (!updatedContent.includes('this.els.fullscreenBtn.addEventListener')) {
        const setupRegex = /(setupWelcomeScreen\(\)\s*\{)/;
        const match = updatedContent.match(setupRegex);
        if (match) {
            const insertPos = match.index + match[0].length;
            const setupJs = `\n                if (this.els.fullscreenBtn) {\n                    this.els.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());\n                }\n                document.addEventListener('fullscreenchange', () => this.updateFullscreenIcon());\n                document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenIcon());\n                document.addEventListener('msfullscreenchange', () => this.updateFullscreenIcon());\n`;
            updatedContent = updatedContent.substring(0, insertPos) + setupJs + updatedContent.substring(insertPos);
        }
    }

    // 6. Inject toggleFullscreen & updateFullscreenIcon methods at end of class
    if (!updatedContent.includes('toggleFullscreen() {')) {
        const closeNavRegex = /(closeMobileNav\(\)\s*\{\s*this\.els\.mobileNav\.classList\.remove\('open'\);\s*\}\s*)/;
        const match = updatedContent.match(closeNavRegex);
        if (match) {
            const insertPos = match.index + match[0].length;
            const methodsJs = `\n            toggleFullscreen() {\n                if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {\n                    const docEl = document.documentElement;\n                    if (docEl.requestFullscreen) docEl.requestFullscreen();\n                    else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();\n                    else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen();\n                } else {\n                    if (document.exitFullscreen) document.exitFullscreen();\n                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();\n                    else if (document.msExitFullscreen) document.msExitFullscreen();\n                }\n            }\n            \n            updateFullscreenIcon() {\n                const icon = document.querySelector('#fullscreenBtn i');\n                if (icon) {\n                    const isFS = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;\n                    if (isFS) {\n                        icon.className = 'fas fa-compress';\n                    } else {\n                        icon.className = 'fas fa-expand';\n                    }\n                }\n            }\n`;
            updatedContent = updatedContent.substring(0, insertPos) + methodsJs + updatedContent.substring(insertPos);
        }
    }

    // Convert line endings back to CRLF for consistency on Windows
    updatedContent = updatedContent.replace(/\n/g, '\r\n');

    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Successfully updated: ${file}`);
}

console.log('All templates have been updated with enhanced styling and fullscreen functionality!');
