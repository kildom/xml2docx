
const bmpHeader = new Uint8Array([
    0x42, 0x4D, 0x36, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x36, 0x04,
    0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x40, 0x00,
    0x00, 0x00, 0x01, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10,
    0x00, 0x00, 0x20, 0x1C, 0x00, 0x00, 0x20, 0x1C, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00
]);

const bmpSuffix = new Uint8Array([
    0x20, 0x45, 0x3a, 0x54, 0x08, 0x94, 0xfc, 0x72, 0x1b, 0xf8, 0x8f, 0xd5, 0xab, 0x68, 0x7e, 0x02,
    0x04, 0x46, 0xd7, 0x43, 0x5d, 0xd1, 0xb8, 0x48, 0xd8, 0x1b, 0x68, 0xc8, 0xd9, 0xb4, 0x64, 0xa3,
    0xa4, 0x46, 0xb3, 0xed, 0xa9, 0xba, 0x01, 0x63, 0x08, 0xe0, 0x5d, 0x3a, 0xef, 0x57, 0x75, 0x62,
    0x8d, 0xa2, 0x4c, 0x10, 0x68, 0xd3, 0xe9, 0x26, 0xbd, 0x0a, 0xdc, 0x4b, 0x5b, 0x39, 0x92, 0x5d,
]);

function dataToImage(data) {
    let text = JSON.stringify(data);
    let binary = new TextEncoder().encode(text);
    let image = new Uint8Array(5174);
    let remaining = image.length - bmpHeader.length - 4 * 256 - bmpSuffix.length;
    if (remaining < binary.length) {
        throw new Error('Not enough space for binary data');
    }
    image.set(bmpHeader);
    let index = 0;
    mainLoop:
    for (let r = 0; r < 256; r += 37) {
        for (let g = 0; g < 256; g += 37) {
            for (let b = 0; b < 256; b += 37) {
                image[bmpHeader.length + 4 * index] = b;
                image[bmpHeader.length + 4 * index + 1] = g;
                image[bmpHeader.length + 4 * index + 2] = r;
                index++;
                if (index >= 256) {
                    break mainLoop;
                }
            }
        }
    }
    image.set(binary, bmpHeader.length + 4 * 256);
    image.set(bmpSuffix, image.length - bmpSuffix.length);
    let base64 = 'data:image/bmp;base64,';
    if (globalThis.btoa) {
        let binaryString = [...image].map(x => String.fromCharCode(x)).join('');
        base64 += btoa(binaryString);
    } else if (globalThis.Buffer && globalThis.Buffer.from) {
        base64 += globalThis.Buffer.from(image).toString('base64');
    } else {
        throw new Error('No base64 encoding available');
    }
    return base64;
}

function testCase(...list) {
    return `
        <section/>
            <p>
                <img src="${dataToImage(list)}" width="64pt" height="64pt" horizontal="page 0cm" vertical="page 0cm"
                /><font color="blue" size="12pt" face="Arial" bold="y">${list.map(x => `${x}<br/>`).join('')}</font>
            </p>
        <section/>
        `;
}
