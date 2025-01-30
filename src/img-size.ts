
const gifSignature = 0x47494638;
const pngSignature = 0x89504E47;
const bmpSignature = 0x424D0000;
const bmpSignatureMask = 0xFFFF0000;
const jpegSignature = 0xFFD8FF00;
const jpegSignatureMask = 0xFFFFFF00;

function getGifSize(view: DataView): { width: number, height: number } {
    return {
        width: view.getUint16(6, true),
        height: view.getUint16(8, true),
    };
}

function getPngSize(view: DataView): { width: number, height: number } {
    return {
        width: view.getUint32(16, false),
        height: view.getUint32(20, false),
    };
}

function getBmpSize(view: DataView): { width: number, height: number } {
    let size = view.getUint32(14, true);
    if (size === 12) {
        return {
            width: view.getUint16(18, true),
            height: view.getUint16(20, true),
        };
    } else {
        return {
            width: view.getUint32(18, true),
            height: view.getUint32(22, true),
        };
    }
}

function getJpegSize(view: DataView): { width: number, height: number } {
    let offset = 2;
    while (offset < view.byteLength) {
        let marker = view.getUint16(offset);
        if (marker >= 0xFFC0 && marker <= 0xFFCF && marker !== 0xFFC4 && marker !== 0xFFC8 && marker !== 0xFFCC) {
            return {
                height: view.getUint16(offset + 5),
                width: view.getUint16(offset + 7),
            };
        }
        offset += 2 + view.getUint16(offset + 2);
    }
    return { width: 0, height: 0 };
}

export function getSize(image: BufferSource): { width: number, height: number } | undefined {
    try {
        let view: DataView;
        let result: { width: number, height: number };

        if (image instanceof ArrayBuffer) {
            view = new DataView(image);
        } else {
            view = new DataView(image.buffer, image.byteOffset, image.byteLength);
        }

        let signature = view.getUint32(0);

        if (signature === gifSignature) {
            result = getGifSize(view);
        } else if (signature === pngSignature) {
            result = getPngSize(view);
        } else if ((signature & bmpSignatureMask) === (bmpSignature & bmpSignatureMask)) {
            result = getBmpSize(view);
        } else if ((signature & jpegSignatureMask) === (jpegSignature & jpegSignatureMask)) {
            result = getJpegSize(view);
        } else {
            return undefined;
        }

        if (result.width <= 0 || result.height <= 0 || result.width > 65535 || result.height > 65535) {
            return undefined;
        }

        return result;

    } catch (_) { } // All errors should be treated as unsupported format

    return undefined;
}
