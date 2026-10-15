import onTheWay from '@/assets/on-the-way.svg';

interface ComingSoonProps {
  title: string;
  message: string;
}

/** A page whose feature is not built yet: an illustration and a short note. */
export function ComingSoon({ title, message }: ComingSoonProps) {
  return (
    <section className="card coming-soon">
      <img src={onTheWay} alt="" className="coming-soon__art" />
      <h2 className="coming-soon__title">{title}</h2>
      <p className="coming-soon__message">{message}</p>
    </section>
  );
}
