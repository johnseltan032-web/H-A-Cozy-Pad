import { useNavigate } from 'react-router-dom';

export default function ListingHeader({ onSaveAndExit }) {
  const navigate = useNavigate();

  const handleCancelListing = () => {
    if (onSaveAndExit) {
      onSaveAndExit();
      return;
    }

    navigate('/host/listings');
  };


  return (
    <header className="listing-header flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5 sm:py-5 md:px-10 lg:px-[52px]">
      
      <button
        type="button"
        onClick={() => navigate('/host/listing')}
        className="text-xl font-bold text-neutral-900 bg-transparent border-none p-0 cursor-pointer sm:text-2xl"
      >
        Booking
      </button>

      <div className="flex items-center gap-2 sm:gap-6">
        
        <button
          type="button"
          onClick={handleCancelListing}
          className="px-4 py-2 text-sm border border-neutral-300 rounded-full text-neutral-700 hover:bg-neutral-50 bg-white cursor-pointer sm:px-5 sm:py-2.5"
        >
          Save & Exit
        </button>


      </div>

    </header>
  );
}