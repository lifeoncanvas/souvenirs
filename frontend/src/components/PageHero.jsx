import { Img } from './ui';

/** Editorial page header: text beside a tall image, or centred text when no image. */
export default function PageHero({ eyebrow, title, text, image, imageAlt = '', children }) {
  if (!image) {
    return (
      <section className="border-b border-espresso/10 bg-champagne/40">
        <div className="container-site py-16 text-center sm:py-24">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1 className="display-lg mx-auto mt-4 max-w-3xl text-balance">{title}</h1>
          {text && <p className="lede mx-auto mt-5 max-w-xl">{text}</p>}
          {children}
        </div>
      </section>
    );
  }
  return (
    <section className="grid border-b border-espresso/10 bg-champagne/40 lg:grid-cols-2">
      <div className="flex items-center px-5 py-16 sm:px-12 lg:px-20 lg:py-28">
        <div className="max-w-lg animate-fadeUp">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1 className="display-lg mt-4 text-balance">{title}</h1>
          {text && <p className="lede mt-6">{text}</p>}
          {children}
        </div>
      </div>
      <Img src={image} alt={imageAlt} eager className="min-h-[340px] lg:min-h-[560px]" />
    </section>
  );
}
