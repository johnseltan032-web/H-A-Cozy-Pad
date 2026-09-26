import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 px-5 md:px-10 lg:px-[52px] py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs md:text-sm text-gray-500">
        <span>© H&A Cozy Pad · Privacy · Terms</span>
        <span>English · PHP</span>
      </div>
    </footer>
  );
}