// Real photos of computer errors used on the landing page, from Wikimedia Commons.
// All are freely licensed; the licences require attribution, which is shown in the site footer.

export interface CreditedImage {
  id: string;
  os: 'Windows' | 'Linux' | 'macOS';
  alt: string;
  /** Wikimedia Commons file name */
  file: string;
  author: string;
  license: string;
  licenseUrl: string;
  /** Original aspect ratio (width / height) */
  ratio: number;
}

export const HERO_PHOTOS: CreditedImage[] = [
  {
    id: 'linux-panic',
    os: 'Linux',
    alt: 'Photo of a monitor showing a Linux kernel panic on Ubuntu',
    file: 'Ubuntu-linux-kernel-panic-by-jpangamarca.JPG',
    author: 'Jpangamarca',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    ratio: 2816 / 2112,
  },
  {
    id: 'mac-panic',
    os: 'macOS',
    alt: 'Photo of an iMac showing a kernel panic message',
    file: 'Kernel-panic-iMac 01.JPG',
    author: 'Traumrune',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    ratio: 3975 / 2640,
  },
  {
    id: 'windows-bsod',
    os: 'Windows',
    alt: 'Photo of a screen showing a Windows blue screen: Your device ran into a problem and needs to restart',
    file: 'Blue Screen of Death - Windows - Your Device Ran Into a Problem and Needs to Restart.jpg',
    author: 'Tony Webster',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    ratio: 5712 / 4284,
  },
];

/** Resized image URL served by Wikimedia (redirects to an upload.wikimedia.org thumbnail). */
export function commonsImageUrl(file: string, width: number): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}

/** The image's description page on Wikimedia Commons (for attribution links). */
export function commonsPageUrl(file: string): string {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`;
}
