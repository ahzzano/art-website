import { ProfileLink } from "@/lib/types"
import Link from "next/link"

// Assume that link has an icon
const IconLink = ({link}: {link: ProfileLink}) => {
    return (
        <svg role="img" viewBox="0 0 24 24" className="size-8 hover:scale-115 transition-transform hover:fill-accent" fill="currentColor" aria-hidden="true">
            <path d={link.icon?.path}/>
        </svg>
    )
}

export const ItemLink = ({link, className, style}: {link: ProfileLink, className?: string, style?: React.CSSProperties}) => {
    return (
        <div className={className} style={style}>
            <Link href={link.url} className="">
                {link.icon ? <IconLink link={link}/> : link.title}
            </Link>
        </div>
    )
}