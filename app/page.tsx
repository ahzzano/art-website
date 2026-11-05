import { ItemLink } from "@/components/item-link";
import { links } from "@/content/links";
import { site } from "@/content/site";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-mauve-800">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-mauve-800">
        <div className="bg-pink-200 p-6 rounded text-gray-900 w-3/5">
            <div className="w-full flex flex-col">
              <h1 className="font-fredoka text-2xl">{site.name}</h1>
              <blockquote>
                <p className="font-fredoka italic font-medium leading-relaxed">
                  Ser amado sino amar
                </p>
              </blockquote>
              <div className="text-gray-900">
                {site.bio}
              </div>
              <div className="mt-6 flex flex-col items-center w-full">
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
