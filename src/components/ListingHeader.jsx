import { useNavigate } from 'react-router-dom';

export default function ListingHeader() {
  const navigate = useNavigate();

  const handleCancelListing = () => {
    navigate('/host/listings');
  };


  return (
    <header className="flex items-center justify-between px-5 md:px-10 lg:px-[52px] py-7 bg-[#fdfdfd] border-b border-neutral-200 shadow-sm">
      
      <button
        type="button"
        onClick={() => navigate('/host/listing')}
        className="text-3xl lg:text-4xl font-bold text-black bg-transparent border-none p-0 cursor-pointer"
      >
        Listing
      </button>

      <div className="flex items-center gap-6">
        
        <button
          type="button"
          onClick={handleCancelListing}
          className="px-6 py-2.5 text-lg md:text-xl border border-black rounded-md hover:bg-neutral-100 bg-transparent cursor-pointer"
        >
          Cancel Listing
        </button>


      </div>

    </header>
  );
}