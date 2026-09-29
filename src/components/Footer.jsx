  export default function Footer() {
    return (
      <footer className="w-full bg-[#eaeaea] pt-8 px-5 md:pt-16 md:px-10 lg:px-[62px]">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-7 pb-8 md:grid-cols-3 md:gap-10 md:pb-12">
          <div className="text-left">
            <h3 className="text-base md:text-xl font-semibold mb-2 md:mb-4">Support</h3>
            <ul className="list-none p-0 m-0">
              <li className="text-sm md:text-lg lg:text-xl font-light leading-6 md:leading-[1.75]"><a href="#">Help Center</a></li>
              <li className="text-sm md:text-lg lg:text-xl font-light leading-6 md:leading-[1.75]"><a href="#">Get help with a safety issue</a></li>
              <li className="text-sm md:text-lg lg:text-xl font-light leading-6 md:leading-[1.75]"><a href="#">Travel insurance</a></li>
              <li className="text-sm md:text-lg lg:text-xl font-light leading-6 md:leading-[1.75]"><a href="#">Cancellation options</a></li>
            </ul>
          </div>
          <div className="text-left md:text-center">
            <h3 className="text-base md:text-xl font-semibold mb-2 md:mb-4">Hosting</h3>
            <ul className="list-none p-0 m-0">
              <li className="text-sm md:text-lg lg:text-xl font-light leading-6 md:leading-[1.75]"><a href="#">Hosting resources</a></li>
              <li className="text-sm md:text-lg lg:text-xl font-light leading-6 md:leading-[1.75]"><a href="#">Community forum</a></li>
              <li className="text-sm md:text-lg lg:text-xl font-light leading-6 md:leading-[1.75]"><a href="#">Hosting responsibly</a></li>
              <li className="text-sm md:text-lg lg:text-xl font-light leading-6 md:leading-[1.75]"><a href="#">Find a co-host</a></li>
            </ul>
          </div>
          <div className="text-left md:text-right">
            <h3 className="text-base md:text-xl font-semibold mb-2 md:mb-4">H&A Cozy Pad</h3>
            <ul className="list-none p-0 m-0">
              <li className="text-sm md:text-lg lg:text-xl font-light leading-6 md:leading-[1.75]"><a href="#">About Us</a></li>
              <li className="text-sm md:text-lg lg:text-xl font-light leading-6 md:leading-[1.75]"><a href="#">How We Work</a></li>
              <li className="text-sm md:text-lg lg:text-xl font-light leading-6 md:leading-[1.75]"><a href="#">Sustainability</a></li>
              <li className="text-sm md:text-lg lg:text-xl font-light leading-6 md:leading-[1.75]"><a href="#">Careers</a></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-start justify-between gap-2 border-t border-neutral-400 py-4 md:flex-row md:items-center md:gap-4 md:py-[18px]">
          <span className="text-sm leading-5 text-[#3c3c3c] md:text-lg lg:text-xl">© H&A Cozy Pad · Privacy · Terms</span>
          <span className="text-sm font-semibold leading-5 text-[#3c3c3c] md:text-lg lg:text-xl">English · PHP</span>
        </div>
      </footer>
    );
  }