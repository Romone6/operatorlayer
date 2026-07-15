import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function FAQAccordion() {
  const faqs = [
    ["Do you support live connectors in MVP?", "MVP is upload and export-first. Connectors are planned."],
    ["Do you auto-send messages?", "No. MVP only drafts, evaluates, repairs, and exports."],
    ["Who owns the data?", "Customers own and control their data, with deletion controls."],
  ];
  return (
    <Accordion type="single" collapsible>
      {faqs.map(([q, a], i) => (
        <AccordionItem key={q} value={`item-${i}`}>
          <AccordionTrigger>{q}</AccordionTrigger>
          <AccordionContent>{a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

