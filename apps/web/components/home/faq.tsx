import Reveal from "@/components/reveal";
import { faqs } from "@/data/faqs";

export default function Faq() {
  return (
    <section
      id="faq"
      className="faq section-anchor"
      data-chapter="black"
      aria-labelledby="faq-title"
    >
      <div className="faq__intro">
        <div className="shell">
          <Reveal>
            <h2 id="faq-title">Questions, answered.</h2>
          </Reveal>
        </div>
      </div>

      {faqs.map((faq, index) => (
        <div className="faq__band" key={faq.question}>
          <div className="shell faq__inner">
            <Reveal delay={index * 40}>
              <h3>{faq.question}</h3>
            </Reveal>
            <Reveal delay={index * 40 + 60}>
              <p>{faq.answer}</p>
            </Reveal>
          </div>
        </div>
      ))}
    </section>
  );
}
