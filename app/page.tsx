import { ItemLink } from "@/components/item-link";
import { links } from "@/content/links";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-mauve-800">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-mauve-800">
        <div className="bg-pink-200 p-6 rounded text-gray-900 w-3/5">
            <div className="w-full flex flex-col">
              <h1 className="font-fredoka text-2xl">Stella (del Dia)</h1>
              <blockquote className="font-fredoka italic">
                Ser amado sino amar
              </blockquote>
              <div className="mt-4 flex flex-col">
                <span className="font-cantarell">Follow me on my socials :{">"}{">"} </span>
                <div className="flex gap-4 py-2">
                  {
                    links.map((link) => 
                      <ItemLink link={link} key={link.title}/>
                    )
                  }
                </div>

              </div>
            </div>
        </div>
      </main>
    </div>
  );
}
