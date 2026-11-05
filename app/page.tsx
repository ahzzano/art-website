import { ItemLink } from "@/components/item-link";
import { links } from "@/content/links";
import { site } from "@/content/site";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16">
        <div className="bg-accent-soft p-6 rounded-xl text-gray-900 w-3/5 motion-safe:animate-fade-in shadow-2xl">
            <div className="w-full flex flex-col gap-5">
              <h1 className="font-fredoka font-semibold text-3xl motion-safe:animate-fade-in motion-safe:[animation-delay:200ms]">{site.name}</h1>
              <div className="motion-safe:animate-fade-in motion-safe:[animation-delay:400ms]">
                <p className="">
                  {site.bio}
                </p>
              </div>
              <div className="flex flex-col items-center w-full motion-safe:animate-fade-in motion-safe:[animation-delay:600ms] ">
                <span className="font-cantarell">Follow me on my socials :{">"}{">"} </span>
                <div className="flex flex-wrap justify-center gap-4 py-2">
                  {
                    links.map((link, i) => 
                      <ItemLink 
                        link={link}
                        key={link.title}
                        className="motion-safe:animate-fade-in"
                        style={{ animationDelay: `${800 + i * 200}ms` }}
                      />
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
