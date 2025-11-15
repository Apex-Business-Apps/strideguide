// @stride/testimonials v1
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Quote } from 'lucide-react';

export const Testimonials: React.FC = () => {

  const testimonials = [
    {
      quote: 'StrideGuide gave me my independence back. I can walk to the store without fear, even when my phone has no signal.',
      author: 'Marie D.',
      location: 'Montreal, QC',
    },
    {
      quote: 'The offline feature is a game-changer. No more worrying about data limits or dead zones. It just works.',
      author: 'James T.',
      location: 'Toronto, ON',
    },
    {
      quote: 'As a senior with vision loss, this app is exactly what I needed. Big buttons, clear voice, and it actually helps me navigate safely.',
      author: 'Sophie L.',
      location: 'Vancouver, BC',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30" aria-labelledby="testimonials-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 id="testimonials-heading" className="text-3xl sm:text-4xl font-bold text-foreground">Trusted by Thousands of Users</h2>
          <p className="mt-3 text-lg text-muted-foreground">Real stories from people who navigate with confidence using StrideGuide</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, idx) => (
            <Card key={idx} className="border-border">
              <CardContent className="p-6 space-y-4">
                <Quote className="w-8 h-8 text-primary/20" aria-hidden="true" />
                <p className="text-sm text-foreground leading-relaxed italic">"{testimonial.quote}"</p>
                <div className="pt-2 border-t border-border">
                  <p className="text-sm font-semibold text-foreground">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
