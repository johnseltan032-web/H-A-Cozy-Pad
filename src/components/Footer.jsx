  import React from 'react';

  export default function Footer() {
    return (
      <footer className="bg-[#eaeaea] pt-16 px-5 md:px-10 lg:px-[62px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-12">
          <div className="text-left">
            <h3 className="text-xl font-semibold mb-4">Support</h3>
            <ul className="list-none p-0 m-0">
              <li className="text-lg lg:text-xl font-light leading-[1.75]"><a href="#">Help Center</a></li>
              <li className="text-lg lg:text-xl font-light leading-[1.75]"><a href="#">Get help with a safety issue</a></li>
              <li className="text-lg lg:text-xl font-light leading-[1.75]"><a href="#">Travel insurance</a></li>
              <li className="text-lg lg:text-xl font-light leading-[1.75]"><a href="#">Cancellation options</a></li>
            </ul>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Hosting</h3>
            <ul className="list-none p-0 m-0">
              <li className="text-lg lg:text-xl font-light leading-[1.75]"><a href="#">Hosting resources</a></li>
              <li className="text-lg lg:text-xl font-light leading-[1.75]"><a href="#">Community forum</a></li>
              <li className="text-lg lg:text-xl font-light leading-[1.75]"><a href="#">Hosting responsibly</a></li>
              <li className="text-lg lg:text-xl font-light leading-[1.75]"><a href="#">Find a co-host</a></li>
            </ul>
          </div>
          <div className="text-right">
            <h3 className="text-xl font-semibold mb-4">H&A Cozy Pad</h3>
            <ul className="list-none p-0 m-0">
              <li className="text-lg lg:text-xl font-light leading-[1.75]"><a href="#">About Us</a></li>
              <li className="text-lg lg:text-xl font-light leading-[1.75]"><a href="#">How We Work</a></li>
              <li className="text-lg lg:text-xl font-light leading-[1.75]"><a href="#">Sustainability</a></li>
              <li className="text-lg lg:text-xl font-light leading-[1.75]"><a href="#">Careers</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-neutral-400 flex flex-col md:flex-row justify-between gap-4 py-[18px]">
          <span className="text-lg lg:text-xl text-[#3c3c3c]">© H&A Cozy Pad · Privacy · Terms</span>
          <span className="text-lg lg:text-xl font-semibold text-[#3c3c3c]">English · PHP</span>
        </div>
      </footer>
    );
  }