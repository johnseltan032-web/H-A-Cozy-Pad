import { useNavigate } from 'react-router-dom';

export default function ListingHeader() {
  const navigate = useNavigate();

  const handleCancelListing = () => {
    navigate('/host/listings');
  };


  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 bg-[#fdfdfd] border-b border-neutral-200 shadow-sm sm:px-5 sm:py-7 md:px-10 lg:px-[52px]">
      
      <button
        type="button"
        onClick={() => navigate('/host/listing')}
        className="text-2xl font-bold text-black bg-transparent border-none p-0 cursor-pointer sm:text-3xl lg:text-4xl"
      >
        Listing
      </button>

      <div className="flex items-center gap-2 sm:gap-6">
        
        <button
          type="button"
          onClick={handleCancelListing}
          className="px-3 py-2 text-sm border border-black rounded-md hover:bg-neutral-100 bg-transparent cursor-pointer sm:px-6 sm:py-2.5 sm:text-lg md:text-xl"
        >
          Cancel Listing
        </button>


      </div>

    </header>
  );
}