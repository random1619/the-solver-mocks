const fs = require('fs');
const path = require('path');
const sass = require('sass');

// 1. Compile base stylesheet from Quant speed boost
console.log('Compiling base styles.scss...');
const result = sass.compile(path.join(__dirname, 'Quant speed boost', 'styles.scss'));
let baseCss = result.css;
console.log('Base SCSS compiled successfully.');

// Define directory color schemes
const schemes = {
    'English': {
        primary: '#10b981',
        primary_hover: '#059669',
        header_bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
    },
    'GS': {
        primary: '#8b5cf6',
        primary_hover: '#7c3aed',
        header_bg: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)'
    },
    'Reasoning Speed': {
        primary: '#f59e0b',
        primary_hover: '#d97706',
        header_bg: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)'
    },
    'Full Mock': {
        primary: '#6366f1',
        primary_hover: '#4f46e5',
        header_bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        externalStyle: true
    },
    'Quant speed boost': {
        primary: '#6366f1',
        primary_hover: '#4f46e5',
        header_bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
    }
};

const fontSnippet = `    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">`;

// Process each directory
for (const [dirName, scheme] of Object.entries(schemes)) {
    const dirPath = path.join(__dirname, dirName);
    if (!fs.existsSync(dirPath)) continue;

    console.log(`\nProcessing directory: ${dirName}...`);
    
    // Customize base CSS variables for this directory
    let customizedCss = baseCss.replace(
        /--primary:\s*[^;]+;/g, 
        `--primary: ${scheme.primary};`
    ).replace(
        /--primary-hover:\s*[^;]+;/g, 
        `--primary-hover: ${scheme.primary_hover};`
    ).replace(
        /--header-bg:\s*[^;]+;/g, 
        `--header-bg: ${scheme.header_bg};`
    );

    // Write customized style.css for external style directories (like Full Mock)
    if (scheme.externalStyle) {
        // Also compile the local style.scss if it exists
        const localScssPath = path.join(dirPath, 'style.scss');
        const localCssPath = path.join(dirPath, 'style.css');
        if (fs.existsSync(localScssPath)) {
            try {
                console.log(`Compiling local style.scss for ${dirName}...`);
                const localResult = sass.compile(localScssPath);
                fs.writeFileSync(localCssPath, localResult.css, 'utf8');
                console.log(`Successfully compiled and wrote ${localCssPath}`);
            } catch (e) {
                console.error(`Error compiling ${localScssPath}:`, e);
            }
        }
    }

    const files = fs.readdirSync(dirPath);
    const htmlFiles = files.filter(f => f.endsWith('.html'));

    console.log(`Found ${htmlFiles.length} HTML files.`);

    for (const file of htmlFiles) {
        const filePath = path.join(dirPath, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Normalize line endings
        content = content.replace(/\r\n/g, '\n');

        // 1. Replace/Inject style block (only if not externalStyle)
        if (!scheme.externalStyle) {
            const startStyleTag = '<style>';
            const endStyleTag = '</style>';
            const startStyleIdx = content.indexOf(startStyleTag);
            const endStyleIdx = content.indexOf(endStyleTag, startStyleIdx);

            if (startStyleIdx !== -1 && endStyleIdx !== -1) {
                // Add google fonts link
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

                content = 
                    content.substring(0, newStartStyleIdx + startStyleTag.length) + 
                    '\n' + customizedCss + '\n' + 
                    content.substring(newEndStyleIdx);
            }
        }

        // 2. Inject Fullscreen button in HTML header
        if (!content.includes('id="fullscreenBtn"')) {
            const timerTag = '<div class="exam-timer">';
            const timerTagIdx = content.indexOf(timerTag);
            if (timerTagIdx !== -1) {
                const insertPos = timerTagIdx + timerTag.length;
                const btnHtml = `\n                <button class="fullscreen-btn" id="fullscreenBtn" title="Toggle Fullscreen">\n                    <i class="fas fa-expand"></i>\n                </button>`;
                content = content.substring(0, insertPos) + btnHtml + content.substring(insertPos);
            }
        }

        // 3. Inject fullscreenBtn initialization in initElements()
        if (!content.includes("fullscreenBtn: document.getElementById('fullscreenBtn')")) {
            const initRegex = /(initElements\(\)\s*\{\s*this\.els\s*=\s*\{)/;
            const match = content.match(initRegex);
            if (match) {
                const insertPos = match.index + match[0].length;
                const initJs = `\n                    fullscreenBtn: document.getElementById('fullscreenBtn'),`;
                content = content.substring(0, insertPos) + initJs + content.substring(insertPos);
            }
        }

        // 4. Inject event listeners in setupWelcomeScreen()
        if (!content.includes('this.els.fullscreenBtn.addEventListener')) {
            const setupRegex = /(setupWelcomeScreen\(\)\s*\{)/;
            const match = content.match(setupRegex);
            if (match) {
                const insertPos = match.index + match[0].length;
                const setupJs = `\n                if (this.els.fullscreenBtn) {\n                    this.els.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());\n                }\n                document.addEventListener('fullscreenchange', () => this.updateFullscreenIcon());\n                document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenIcon());\n                document.addEventListener('msfullscreenchange', () => this.updateFullscreenIcon());\n`;
                content = content.substring(0, insertPos) + setupJs + content.substring(insertPos);
            }
        }

        // 5. Inject toggleFullscreen & updateFullscreenIcon methods at end of class
        if (!content.includes('toggleFullscreen() {')) {
            const closeNavRegex = /(closeMobileNav\(\)\s*\{\s*this\.els\.mobileNav\.classList\.remove\('open'\);\s*\}\s*)/;
            const match = content.match(closeNavRegex);
            if (match) {
                const insertPos = match.index + match[0].length;
                const methodsJs = `\n            toggleFullscreen() {\n                if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {\n                    const docEl = document.documentElement;\n                    if (docEl.requestFullscreen) docEl.requestFullscreen();\n                    else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();\n                    else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen();\n                } else {\n                    if (document.exitFullscreen) document.exitFullscreen();\n                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();\n                    else if (document.msExitFullscreen) document.msExitFullscreen();\n                }\n            }\n            \n            updateFullscreenIcon() {\n                const icon = document.querySelector('#fullscreenBtn i');\n                if (icon) {\n                    const isFS = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;\n                    if (isFS) {\n                        icon.className = 'fas fa-compress';\n                    } else {\n                        icon.className = 'fas fa-expand';\n                    }\n                }\n            }\n`;
                content = content.substring(0, insertPos) + methodsJs + content.substring(insertPos);
            }
        }

        // Convert back to CRLF
        content = content.replace(/\n/g, '\r\n');

        fs.writeFileSync(filePath, content, 'utf8');
    }
}

console.log('All remaining mocks have been enhanced successfully with custom subject color schemes and fullscreen controls!');
