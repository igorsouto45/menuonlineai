import type { Database } from '@/integrations/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];

interface PrinterConfig {
  width: number;  // Characters per line (typically 32, 42, or 48)
  encoding: string;
}

const defaultConfig: PrinterConfig = {
  width: 42,
  encoding: 'utf-8',
};

function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function leftRight(left: string, right: string, width: number): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(spaces) + right;
}

function separator(char: string, width: number): string {
  return char.repeat(width);
}

interface OrderItem {
  productName?: string;
  name?: string;
  quantity: number;
  unitPrice?: number;
  price?: number;
  subtotal?: number;
  variation?: string | null;
  additionals?: string[];
}

function formatOrderForPrint(order: Order, restaurantName?: string, config: PrinterConfig = defaultConfig): string {
  const { width } = config;
  const lines: string[] = [];
  const items = (order.items as unknown as OrderItem[]) || [];

  // Header
  lines.push('');
  if (restaurantName) {
    lines.push(centerText(restaurantName.toUpperCase(), width));
  }
  lines.push(separator('=', width));
  lines.push(centerText('PEDIDO', width));
  lines.push(centerText(`#${order.id.slice(0, 8).toUpperCase()}`, width));
  lines.push(separator('=', width));
  
  // Date/Time
  const orderDate = new Date(order.created_at);
  lines.push(centerText(orderDate.toLocaleString('pt-BR'), width));
  lines.push('');

  // Customer Info
  if (order.customer_name) {
    lines.push(`Cliente: ${order.customer_name}`);
  }
  if (order.customer_phone) {
    lines.push(`Telefone: ${order.customer_phone}`);
  }
  if (order.customer_address) {
    lines.push(`Endereco: ${order.customer_address}`);
  }
  lines.push(separator('-', width));

  // Items
  lines.push(centerText('ITENS', width));
  lines.push(separator('-', width));
  
  items.forEach((item) => {
    const itemName = item.productName || item.name || 'Item';
    const itemPrice = item.unitPrice ?? item.price ?? 0;
    const itemTotal = (itemPrice * item.quantity).toFixed(2);
    lines.push(leftRight(`${item.quantity}x ${itemName}`, `R$ ${itemTotal}`, width));
    
    if (item.variation) {
      lines.push(`   -> ${item.variation}`);
    }
    
    if (item.additionals && item.additionals.length > 0) {
      item.additionals.forEach((add) => {
        lines.push(`   + ${add}`);
      });
    }
  });

  lines.push(separator('-', width));
  
  // Calculate subtotal of items
  const itemsSubtotal = items.reduce((sum, item) => {
    const itemPrice = item.unitPrice ?? item.price ?? 0;
    return sum + (itemPrice * item.quantity);
  }, 0);
  
  // Calculate delivery fee (difference between total and items subtotal)
  const deliveryFee = Number(order.total) - itemsSubtotal;
  
  // Subtotal
  lines.push(leftRight('SUBTOTAL:', `R$ ${itemsSubtotal.toFixed(2)}`, width));
  
  // Delivery fee (only show if > 0, meaning it's a delivery)
  if (deliveryFee > 0.01) {
    lines.push(leftRight('TAXA DE ENTREGA:', `R$ ${deliveryFee.toFixed(2)}`, width));
  }
  
  lines.push(separator('-', width));
  
  // Total
  lines.push(leftRight('TOTAL:', `R$ ${Number(order.total).toFixed(2)}`, width));
  lines.push(separator('=', width));

  // Payment method (extract from notes if present)
  if (order.notes) {
    lines.push('');
    const paymentMatch = order.notes.match(/Pagamento na entrega: ([^\n]+)/i);
    if (paymentMatch) {
      lines.push(centerText('FORMA DE PAGAMENTO', width));
      lines.push(centerText(paymentMatch[1], width));
    }
    
    // Check for other observations (exclude payment info)
    const otherNotes = order.notes.replace(/Pagamento na entrega: [^\n]+/gi, '').trim();
    if (otherNotes) {
      lines.push('');
      lines.push('OBSERVACOES:');
      const words = otherNotes.split(' ');
      let currentLine = '';
      words.forEach((word) => {
        if ((currentLine + ' ' + word).length > width) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        }
      });
      if (currentLine) {
        lines.push(currentLine);
      }
    }
  }

  lines.push('');
  lines.push(separator('=', width));
  lines.push(centerText('Obrigado pela preferencia!', width));
  lines.push('');
  lines.push('');
  lines.push('');

  return lines.join('\n');
}

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

const commands = {
  init: ESC + '@',                    // Initialize printer
  cut: GS + 'V' + '\x00',             // Full cut
  partialCut: GS + 'V' + '\x01',      // Partial cut
  feedLines: (n: number) => ESC + 'd' + String.fromCharCode(n),
  bold: (on: boolean) => ESC + 'E' + (on ? '\x01' : '\x00'),
  center: ESC + 'a' + '\x01',
  left: ESC + 'a' + '\x00',
  doubleHeight: (on: boolean) => ESC + '!' + (on ? '\x10' : '\x00'),
  doubleWidth: (on: boolean) => ESC + '!' + (on ? '\x20' : '\x00'),
};

function generateESCPOS(order: Order, restaurantName?: string): Uint8Array {
  const text = formatOrderForPrint(order, restaurantName);
  const encoder = new TextEncoder();
  
  // Build ESC/POS byte array
  const parts: Uint8Array[] = [];
  
  // Initialize
  parts.push(encoder.encode(commands.init));
  
  // Content
  parts.push(encoder.encode(text));
  
  // Feed and cut
  parts.push(encoder.encode(commands.feedLines(3)));
  parts.push(encoder.encode(commands.partialCut));
  
  // Combine all parts
  const totalLength = parts.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  
  return result;
}

// Print using Web Serial API (for USB thermal printers)
export async function printToUSB(order: Order, restaurantName?: string): Promise<boolean> {
  try {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API não suportada neste navegador');
    }

    // Request port
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });

    const writer = port.writable.getWriter();
    const data = generateESCPOS(order, restaurantName);
    
    await writer.write(data);
    await writer.close();
    await port.close();

    return true;
  } catch (error) {
    console.error('Erro ao imprimir:', error);
    return false;
  }
}

// Print using browser print dialog (fallback)
export function printOrder(order: Order, restaurantName?: string): void {
  const text = formatOrderForPrint(order, restaurantName);
  
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (!printWindow) {
    alert('Por favor, permita popups para imprimir');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pedido #${order.id.slice(0, 8).toUpperCase()}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          width: 80mm;
          margin: 0;
          padding: 5mm;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        @media print {
          body {
            width: 72mm;
          }
        }
      </style>
    </head>
    <body>${text.replace(/\n/g, '<br>')}</body>
    </html>
  `);
  
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

// Network printer (for future implementation)
export async function printToNetwork(
  order: Order, 
  printerIP: string, 
  printerPort: number = 9100,
  restaurantName?: string
): Promise<boolean> {
  // This would require a backend service or WebSocket bridge
  // as browsers cannot directly connect to TCP sockets
  console.log(`Would print to ${printerIP}:${printerPort}`);
  console.log(formatOrderForPrint(order, restaurantName));
  return false;
}

export { formatOrderForPrint, generateESCPOS };
