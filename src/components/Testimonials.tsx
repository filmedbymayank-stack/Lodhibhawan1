import { motion } from 'motion/react';

const testimonials = [
  {
    text: "The Nihari took me straight back to the bylanes of Jama Masjid. Absolutely authentic and the ambiance is pure luxury.",
    author: "Rahul S."
  },
  {
    text: "A brilliant concept. They've managed to capture the chaotic beauty of Old Delhi and present it in a fine-dining experience.",
    author: "Priya M."
  },
  {
    text: "Best Butter Chicken in Chandigarh, hands down. The vintage decor and sepia tones make you feel like you've stepped back in time.",
    author: "Aman K."
  }
];

export default function Testimonials() {
  return (
    <section id="reviews" className="py-16 md:py-24 bg-darker border-y border-primary/10">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {testimonials.map((t, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="text-center"
            >
              <div className="text-primary text-4xl font-serif mb-4">"</div>
              <p className="text-secondary/80 font-light italic mb-6 leading-relaxed">
                {t.text}
              </p>
              <h6 className="text-sm uppercase tracking-widest text-primary">{t.author}</h6>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
