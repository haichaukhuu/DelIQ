import type { DeliverySnapshot } from './types.js';

export function stockholmTime(value: string | Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function customerMessage(kind: 'eta' | 'delay' | 'transfer' | 'split' | 'reschedule' | 'backup' | 'site' | 'redelivery' | 'escalation', snapshot: DeliverySnapshot, eta?: string | Date): string {
  const name = snapshot.order.contactName ? ` ${snapshot.order.contactName}` : '';
  const time = eta ? stockholmTime(eta) : '';
  const sv: Record<string, string> = {
    eta: `Hej${name}, er leverans är planerad till kl. ${time}. Vi återkommer om något ändras. /DelIQ`,
    delay: `Hej${name}, leveransen är försenad. Ny beräknad tid är kl. ${time}. Vi håller er uppdaterade. /DelIQ`,
    transfer: `Hej${name}, vi säkrar de saknade artiklarna från ett annat lager. Ny beräknad tid är kl. ${time}. /DelIQ`,
    split: `Hej${name}, vi levererar tillgängliga artiklar först och återkommer med en tid för resten. /DelIQ`,
    reschedule: `Hej${name}, vi behöver boka om leveransen. Kontakta oss så hittar vi en ny tid. /DelIQ`,
    backup: `Hej${name}, vi har ordnat en alternativ transportör och återkommer med uppdaterad leveranstid. /DelIQ`,
    site: `Hej${name}, kan ni bekräfta portkod och att eventuell kran är redo inför leveransen? /DelIQ`,
    redelivery: `Hej${name}, vi bokar om leveransen till nästa vardagsmorgon. /DelIQ`,
    escalation: `Hej${name}, en kollega kontaktar er snarast för att lösa leveransen. /DelIQ`,
  };
  const en: Record<string, string> = {
    eta: `Hello${name}, your delivery is planned for ${time}. We will update you if anything changes. /DelIQ`,
    delay: `Hello${name}, your delivery is delayed. The new estimated time is ${time}. We will keep you updated. /DelIQ`,
    transfer: `Hello${name}, we are securing the missing items from another distribution centre. The new estimated time is ${time}. /DelIQ`,
    split: `Hello${name}, we will deliver the available items first and confirm a time for the remainder. /DelIQ`,
    reschedule: `Hello${name}, we need to reschedule the delivery. Please contact us to agree a new slot. /DelIQ`,
    backup: `Hello${name}, we arranged an alternative carrier and will confirm the updated delivery time. /DelIQ`,
    site: `Hello${name}, please confirm the gate code and that any required crane is ready for delivery. /DelIQ`,
    redelivery: `Hello${name}, we are booking a redelivery for the next business morning. /DelIQ`,
    escalation: `Hello${name}, a colleague will contact you shortly to resolve the delivery. /DelIQ`,
  };
  return (snapshot.order.preferredLanguage === 'sv' ? sv : en)[kind];
}
