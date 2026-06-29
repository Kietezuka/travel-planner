import Link from "next/link"
import Image from "next/image"

export default function Footer(){
    return(
        <footer className="footer">
            <div className="footer__inner container">
                    <Link href='/' className='footer__logo'>
                        <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="currentColor">
                            <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q146 0 255.5 91.5T872-559h-82q-19-73-68.5-130.5T600-776v16q0 33-23.5 56.5T520-680h-80v80q0 17-11.5 28.5T400-560h-80v80h80v120h-40L168-552q-3 18-5.5 36t-2.5 36q0 131 92 225t228 95v80Zm364-20L716-228q-21 12-45 20t-51 8q-75 0-127.5-52.5T440-380q0-75 52.5-127.5T620-560q75 0 127.5 52.5T800-380q0 27-8 51t-20 45l128 128-56 56ZM691-309q29-29 29-71t-29-71q-29-29-71-29t-71 29q-29 29-29 71t29 71q29 29 71 29t71-29Z"/>
                        </svg>
                        <span>Travel Planner</span>
                    </Link>

                    <div className='footer__socials'>
                        <Link className='social__link' href="mailto:tezukakie@gmail.com" aria-label="Send email" title="Email">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z"/>
                            </svg>
                        </Link>
                        <Link
                            className="social__link"
                            href="https://github.com/Kietezuka/travel-planner"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub repository"
                            title="GitHub"
                            >
                            <Image className="social__icon" src="/icons/github-mark.png" alt="github icon" width={24} height={24} loading="lazy"/>
                        </Link>
                        <Link
                            className="social__link"
                            href="https://www.linkedin.com/in/tezukakie/"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn profile"
                            title="LinkedIn"
                            >
                            <Image className="social__icon" src="/icons/linkedIn.png" alt="LinkedIn Logo" width={24} height={24} loading="lazy"/>
                        </Link>
                </div>
            </div>
            <div className='footer__bottom'>
                <p className='footer__copyright'>© {new Date().getFullYear()} Travel Planner. All rights reserved.</p>
            </div>
    </footer>
    )
}