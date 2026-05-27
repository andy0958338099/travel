import Link from "next/link";

interface CardProps {
  title: string;
  href: string;
  count?: number;
  description?: string;
}

export function Card({ title, href, count, description }: CardProps) {
  return (
    <Link href={href}>
      <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        {count !== undefined && (
          <p className="text-3xl font-bold text-blue-500 mb-2">{count}</p>
        )}
        {description && (
          <p className="text-gray-600 text-sm">{description}</p>
        )}
      </div>
    </Link>
  );
}
