// Generates a printable PDF with one QR Code per restaurant table.
// Uses jsPDF (lazy-loaded) and grabs the SVG QR Code that QRCodeSVG renders in the DOM.

export type QrLayout = 'standard' | 'large' | 'counter' | 'vip';

export interface TableQrPdfItem {
  tableNumber: string;
  url: string;
}

interface GeneratePdfOptions {
  restaurantName: string;
  tables: TableQrPdfItem[];
  layout: QrLayout;
  getSvgElement: (tableNumber: string) => SVGElement | null;
}

const svgToPngDataUrl = (svg: SVGElement, size = 1000): Promise<string> =>
  new Promise((resolve, reject) => {
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load QR SVG'));
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      reject(e);
    }
  });

const loadLogoDataUrl = async (): Promise<string | null> => {
  try {
    const res = await fetch('/pwa-192x192.png');
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === 'string' ? r.result : null);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const layoutMeta: Record<QrLayout, { label: string; accent: [number, number, number]; banner?: string; subtitle: string }> = {
  standard: {
    label: 'Mesa',
    accent: [243, 121, 52],
    subtitle: 'Aponte a câmera do celular para abrir o cardápio',
  },
  large: {
    label: 'Mesa',
    accent: [243, 121, 52],
    subtitle: 'Escaneie e peça pelo celular',
  },
  counter: {
    label: 'Balcão',
    accent: [38, 38, 38],
    subtitle: 'Faça seu pedido pelo celular',
    banner: 'PEÇA E RETIRE',
  },
  vip: {
    label: 'VIP',
    accent: [184, 134, 11],
    subtitle: 'Experiência exclusiva — escaneie para começar',
    banner: 'ÁREA VIP',
  },
};

export async function generateTablesQrPdf(opts: GeneratePdfOptions) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const pageW = 210;
  const pageH = 297;
  const meta = layoutMeta[opts.layout];
  const logoDataUrl = await loadLogoDataUrl();

  for (let i = 0; i < opts.tables.length; i++) {
    const item = opts.tables[i];
    if (i > 0) doc.addPage();

    const svg = opts.getSvgElement(item.tableNumber);
    if (!svg) continue;

    let pngDataUrl: string;
    try {
      pngDataUrl = await svgToPngDataUrl(svg, 1200);
    } catch (e) {
      console.error('Failed to render QR for', item.tableNumber, e);
      continue;
    }

    // === Top banner (VIP / Counter only) ===
    if (meta.banner) {
      doc.setFillColor(meta.accent[0], meta.accent[1], meta.accent[2]);
      doc.rect(0, 0, pageW, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(meta.banner, pageW / 2, 12, { align: 'center' });
    }

    // === Restaurant name ===
    const topY = meta.banner ? 32 : 24;
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text(opts.restaurantName, pageW / 2, topY, { align: 'center' });

    // === Table label (BIG) ===
    doc.setTextColor(meta.accent[0], meta.accent[1], meta.accent[2]);
    doc.setFont('helvetica', 'bold');
    const titleSize = opts.layout === 'large' ? 64 : opts.layout === 'vip' ? 54 : 48;
    doc.setFontSize(titleSize);
    const labelLine = `${meta.label} ${item.tableNumber}`;
    doc.text(labelLine, pageW / 2, topY + 24, { align: 'center' });

    // === QR Code ===
    const qrSize = opts.layout === 'large' ? 140 : 120;
    const qrX = (pageW - qrSize) / 2;
    const qrY = topY + 38;

    // QR border frame
    doc.setDrawColor(meta.accent[0], meta.accent[1], meta.accent[2]);
    doc.setLineWidth(opts.layout === 'vip' ? 2 : 1);
    doc.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 4, 4);

    doc.addImage(pngDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // === Instruction ===
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(opts.layout === 'large' ? 16 : 13);
    doc.text(meta.subtitle, pageW / 2, qrY + qrSize + 18, { align: 'center' });

    // === Steps ===
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    const steps = [
      '1. Abra a câmera do celular',
      '2. Aponte para o QR Code',
      '3. Toque na notificação que aparecer',
    ];
    steps.forEach((s, idx) => {
      doc.text(s, pageW / 2, qrY + qrSize + 30 + idx * 6, { align: 'center' });
    });

    // === Footer ===
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(item.url, pageW / 2, pageH - 14, { align: 'center' });
    doc.text(`Pedido digital • ${opts.restaurantName}`, pageW / 2, pageH - 8, { align: 'center' });

    // === Corner ornaments for VIP ===
    if (opts.layout === 'vip') {
      doc.setDrawColor(meta.accent[0], meta.accent[1], meta.accent[2]);
      doc.setLineWidth(1);
      const m = 10;
      const L = 18;
      // top-left
      doc.line(m, m, m + L, m); doc.line(m, m, m, m + L);
      // top-right
      doc.line(pageW - m, m, pageW - m - L, m); doc.line(pageW - m, m, pageW - m, m + L);
      // bottom-left
      doc.line(m, pageH - m, m + L, pageH - m); doc.line(m, pageH - m, m, pageH - m - L);
      // bottom-right
      doc.line(pageW - m, pageH - m, pageW - m - L, pageH - m); doc.line(pageW - m, pageH - m, pageW - m, pageH - m - L);
    }
  }

  const fileName = `qr-codes-mesas-${opts.layout}-${Date.now()}.pdf`;
  doc.save(fileName);
}
