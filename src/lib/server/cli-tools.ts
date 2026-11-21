import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const execFileAsync = promisify(execFile);

export interface CliToolStatus {
  available: boolean;
  path?: string;
  version?: string;
  error?: string;
}

export interface CliToolsReport {
  soffice: CliToolStatus;
  gs: CliToolStatus;
  qpdf: CliToolStatus;
  pdftoppm: CliToolStatus;
  pdftotext: CliToolStatus;
}

const KNOWN_PATHS = {
  soffice: ['/usr/bin/soffice', '/usr/local/bin/soffice'],
  gs: ['/usr/bin/gs', '/usr/local/bin/gs'],
  qpdf: ['/usr/bin/qpdf', '/usr/local/bin/qpdf'],
  pdftoppm: ['/usr/bin/pdftoppm', '/usr/local/bin/pdftoppm'],
  pdftotext: ['/usr/bin/pdftotext', '/usr/local/bin/pdftotext'],
};

export async function checkCliTool(tool: keyof typeof KNOWN_PATHS): Promise<CliToolStatus> {
  const candidatePaths = KNOWN_PATHS[tool];
  for (const p of candidatePaths) {
    try {
      await fs.access(p, fs.constants.X_OK);
      const versionArg = tool === 'soffice' ? '--version' : tool === 'qpdf' ? '--version' : '--version';
      const { stdout } = await execFileAsync(p, [versionArg], { timeout: 5000 });
      return {
        available: true,
        path: p,
        version: stdout.trim().split('\n')[0],
      };
    } catch {
      // Continue to next path or fail
    }
  }

  // Try standard PATH lookup
  try {
    const { stdout: whichOut } = await execFileAsync('which', [tool], { timeout: 3000 });
    const resolvedPath = whichOut.trim();
    if (resolvedPath) {
      const { stdout: verOut } = await execFileAsync(resolvedPath, ['--version'], { timeout: 5000 });
      return {
        available: true,
        path: resolvedPath,
        version: verOut.trim().split('\n')[0],
      };
    }
  } catch (err: unknown) {
    return {
      available: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return { available: false, error: 'Command not found' };
}

export async function checkAllCliTools(): Promise<CliToolsReport> {
  const [soffice, gs, qpdf, pdftoppm, pdftotext] = await Promise.all([
    checkCliTool('soffice'),
    checkCliTool('gs'),
    checkCliTool('qpdf'),
    checkCliTool('pdftoppm'),
    checkCliTool('pdftotext'),
  ]);

  return { soffice, gs, qpdf, pdftoppm, pdftotext };
}

export async function createTempDir(prefix = 'job'): Promise<string> {
  const baseDir = path.join(os.tmpdir(), 'docuforge-studio');
  await fs.mkdir(baseDir, { recursive: true });
  const uniqueId = `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const targetDir = path.join(baseDir, uniqueId);
  await fs.mkdir(targetDir, { recursive: true });
  return targetDir;
}

export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    if (dirPath && dirPath.includes('docuforge-studio')) {
      await fs.rm(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Błąd podczas usuwania katalogu tymczasowego ${dirPath}:`, err);
  }
}

export async function cleanupTempFiles(filePaths: string[]): Promise<void> {
  for (const fp of filePaths) {
    try {
      if (fp && fp.includes('docuforge-studio')) {
        await fs.unlink(fp);
      }
    } catch {
      // Ignore cleanup error
    }
  }
}

export async function runCliCommand(
  cmd: string,
  args: string[],
  timeoutMs = 60000
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execFileAsync(cmd, args, { timeout: timeoutMs, maxBuffer: 100 * 1024 * 1024 });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Błąd wykonania polecenia CLI (${cmd} ${args.join(' ')}): ${message}`);
  }
}

export async function convertDocxToPdf(inputDocxPath: string, outputDir: string): Promise<string> {
  const soffice = await checkCliTool('soffice');
  if (!soffice.available || !soffice.path) {
    throw new Error('LibreOffice (soffice) nie jest dostępny w systemie.');
  }

  await runCliCommand(soffice.path, [
    '--headless',
    '--convert-to',
    'pdf',
    '--outdir',
    outputDir,
    inputDocxPath,
  ]);

  const baseName = path.basename(inputDocxPath, path.extname(inputDocxPath));
  const expectedPdfPath = path.join(outputDir, `${baseName}.pdf`);

  await fs.access(expectedPdfPath, fs.constants.R_OK);
  return expectedPdfPath;
}

export async function compressPdfWithGs(
  inputPdfPath: string,
  outputPdfPath: string,
  level: 'low' | 'balanced' | 'extreme',
  linearize = true
): Promise<{ originalSize: number; compressedSize: number; reductionPercent: number }> {
  const gs = await checkCliTool('gs');
  if (!gs.available || !gs.path) {
    throw new Error('Ghostscript (gs) nie jest dostępny w systemie.');
  }

  const pdfSettingsMap = {
    low: '/printer',
    balanced: '/ebook',
    extreme: '/screen',
  };

  const tempGsOut = outputPdfPath + '.gs.pdf';

  const args = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    `-dPDFSETTINGS=${pdfSettingsMap[level]}`,
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    `-sOutputFile=${tempGsOut}`,
    inputPdfPath,
  ];

  await runCliCommand(gs.path, args);

  if (linearize) {
    const qpdf = await checkCliTool('qpdf');
    if (qpdf.available && qpdf.path) {
      try {
        await runCliCommand(qpdf.path, ['--linearize', tempGsOut, outputPdfPath]);
        await fs.unlink(tempGsOut).catch(() => {});
      } catch {
        await fs.rename(tempGsOut, outputPdfPath);
      }
    } else {
      await fs.rename(tempGsOut, outputPdfPath);
    }
  } else {
    await fs.rename(tempGsOut, outputPdfPath);
  }

  const [inStat, outStat] = await Promise.all([
    fs.stat(inputPdfPath),
    fs.stat(outputPdfPath),
  ]);

  const originalSize = inStat.size;
  const compressedSize = outStat.size;
  const reductionPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

  return {
    originalSize,
    compressedSize,
    reductionPercent,
  };
}

export interface PdfToImagesOptions {
  format: 'png' | 'jpeg' | 'jpg' | 'webp';
  dpi: number;
  firstPage?: number;
  lastPage?: number;
}

export async function convertPdfToImages(
  inputPdfPath: string,
  outputDir: string,
  options: PdfToImagesOptions
): Promise<string[]> {
  const pdftoppm = await checkCliTool('pdftoppm');
  const pdftoppmPath = pdftoppm.path || '/usr/bin/pdftoppm';

  const formatFlag = options.format === 'jpeg' || options.format === 'jpg' ? '-jpeg' : '-png';
  const prefix = path.join(outputDir, 'page');

  const args: string[] = [formatFlag, '-r', String(options.dpi || 150)];
  if (options.firstPage && options.firstPage > 0) {
    args.push('-f', String(options.firstPage));
  }
  if (options.lastPage && options.lastPage > 0) {
    args.push('-l', String(options.lastPage));
  }
  args.push(inputPdfPath, prefix);

  await runCliCommand(pdftoppmPath, args);

  const files = await fs.readdir(outputDir);
  let imageFiles = files
    .filter((f) => f.startsWith('page-') && !f.endsWith('.tmp'))
    .map((f) => path.join(outputDir, f));

  if (options.format === 'webp') {
    const webpFiles: string[] = [];
    for (const imgPath of imageFiles) {
      const base = imgPath.replace(/\.[^/.]+$/, '');
      const webpPath = `${base}.webp`;
      await runCliCommand('/usr/bin/ffmpeg', ['-i', imgPath, '-y', webpPath], 30000);
      await fs.unlink(imgPath).catch(() => {});
      webpFiles.push(webpPath);
    }
    imageFiles = webpFiles;
  }

  imageFiles.sort((a, b) => {
    const numA = parseInt(path.basename(a).match(/\d+/)?.[0] || '0', 10);
    const numB = parseInt(path.basename(b).match(/\d+/)?.[0] || '0', 10);
    return numA - numB;
  });

  return imageFiles;
}

export async function convertImageToPng(inputPath: string, outputPath: string): Promise<string> {
  await runCliCommand('/usr/bin/ffmpeg', ['-i', inputPath, '-y', outputPath], 30000);
  return outputPath;
}

export async function encryptPdf(
  inputPdfPath: string,
  outputPdfPath: string,
  userPassword: string,
  ownerPassword?: string,
  keyLength: 128 | 256 = 256
): Promise<string> {
  const qpdf = await checkCliTool('qpdf');
  if (!qpdf.available || !qpdf.path) {
    throw new Error('QPDF nie jest dostępny w systemie.');
  }

  const effectiveOwnerPassword = ownerPassword && ownerPassword.trim() ? ownerPassword.trim() : userPassword;

  await runCliCommand(qpdf.path, [
    '--encrypt',
    userPassword,
    effectiveOwnerPassword,
    String(keyLength),
    '--',
    inputPdfPath,
    outputPdfPath,
  ]);

  return outputPdfPath;
}

export async function decryptPdf(
  inputPdfPath: string,
  outputPdfPath: string,
  password: string
): Promise<string> {
  const qpdf = await checkCliTool('qpdf');
  if (!qpdf.available || !qpdf.path) {
    throw new Error('QPDF nie jest dostępny w systemie.');
  }

  await runCliCommand(qpdf.path, [
    `--password=${password}`,
    '--decrypt',
    inputPdfPath,
    outputPdfPath,
  ]);

  return outputPdfPath;
}
