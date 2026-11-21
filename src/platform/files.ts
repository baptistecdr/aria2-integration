export function encodeFileToBase64(file: File | Blob) {
  return new Promise((resolve, reject) => {
    const temporaryFileReader = new FileReader();
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort();
      reject(new Error(`Cannot parse '${file}'.`));
    };
    temporaryFileReader.onloadend = () => {
      if (temporaryFileReader.result) {
        const splitResult = temporaryFileReader.result.toString().split(/[:;,]/);
        if (splitResult.length >= 4) {
          resolve(splitResult[3]);
        } else {
          reject(new Error(`Cannot get base64 encoded string for '${file}'.`));
        }
      } else {
        reject(new Error(`Result is empty for '${file}'.`));
      }
    };
    temporaryFileReader.readAsDataURL(file);
  });
}

export async function download(url: string): Promise<Blob> {
  const res = await fetch(url);
  return res.blob();
}
