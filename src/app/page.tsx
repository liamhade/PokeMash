import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Image from 'next/image'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: cards } = await supabase.from('pokemon-cards').select()

  return (
    <ul className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4">
      {cards?.map((card) => (
        <li key={card.name} className="flex flex-col items-center gap-2">
          {card.image && (
            <Image src={card.image} alt={card.name} width={200} height={280} className="rounded" />
          )}
          <span>{card.name}</span>
        </li>
      ))}
    </ul>
  )
}