import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ListingHeader from '../../components/ListingHeader';

export default function PlaceImages() {
  const navigate = useNavigate();

  const [images, setImages] = useState([]);
  const [error, setError] = useState('');

  // Clean up preview URLs when the component unmounts.
  // The actual File objects are passed through React Router state.
  useEffect(() => {
    return () => {
      images.forEach((image) => {
        URL.revokeObjectURL(image.preview);
      });
    };
  }, []);

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith('image/');
      const isUnder10MB = file.size <= 10 * 1024 * 1024;

      return isImage && isUnder10MB;
    });

    if (validFiles.length !== files.length) {
      setError('Only image files up to 10 MB each are allowed.');
    } else {
      setError('');
    }

    const newImages = validFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((currentImages) => [
      ...currentImages,
      ...newImages,
    ]);

    // Allows selecting the same file again later.
    event.target.value = '';
  };

  const removeImage = (id) => {
    setImages((currentImages) => {
      const imageToRemove = currentImages.find(
        (image) => image.id === id
      );

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }

      return currentImages.filter((image) => image.id !== id);
    });
  };

  const handleContinue = () => {
    if (images.length === 0) {
      setError('Please upload at least one image of your property.');
      return;
    }

    navigate('/host/listing/ListingPublish', {
      state: {
        images: images.map((image) => image.file),
      },
    });
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">

      {/* Header */}
      <ListingHeader
        onOpenQuestions={() => console.log('Questions')}
        onSaveAndExit={() => console.log('Save & Exit')}
      />

      <main className="flex-1 flex flex-col">

        <div className="w-full max-w-[700px] mx-auto px-5 pt-10 md:pt-12">

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-[24px] md:text-[28px] font-semibold leading-tight">
              Upload images of your property
            </h1>

            <p className="mt-3 text-[15px] md:text-[16px] text-neutral-600">
              Add photos that show guests what your property looks like.
            </p>
          </div>

          {/* Upload box */}
          <label
            htmlFor="property-images"
            className="
              block
              w-full
              min-h-[250px]
              border-2
              border-dashed
              border-neutral-400
              rounded-[20px]
              cursor-pointer
              hover:bg-neutral-50
              transition
            "
          >
            <div className="h-full min-h-[250px] flex flex-col items-center justify-center px-6 text-center">

              <div
                className="
                  w-14
                  h-14
                  rounded-full
                  bg-neutral-100
                  flex
                  items-center
                  justify-center
                  mb-4
                "
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 16V4" />
                  <path d="M7 9l5-5 5 5" />
                  <path d="M5 20h14" />
                </svg>
              </div>

              <h2 className="text-[18px] font-medium">
                Upload photos
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Click to choose images from your device
              </p>

              <p className="mt-1 text-xs text-neutral-400">
                JPG, JPEG, PNG • Maximum 10 MB per image
              </p>

              <input
                id="property-images"
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </label>

          {/* Error */}
          {error && (
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Uploaded photos */}
          {images.length > 0 && (
            <section className="mt-8">

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-semibold">
                  Your photos
                </h2>

                <span className="text-sm text-neutral-500">
                  {images.length}{' '}
                  {images.length === 1 ? 'photo' : 'photos'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="
                      relative
                      aspect-square
                      rounded-[14px]
                      overflow-hidden
                      bg-neutral-100
                      border
                      border-neutral-200
                    "
                  >
                    <img
                      src={image.preview}
                      alt={`Property ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="
                        absolute
                        top-2
                        right-2
                        w-8
                        h-8
                        rounded-full
                        bg-white
                        shadow-md
                        flex
                        items-center
                        justify-center
                        hover:bg-neutral-100
                        transition
                      "
                      aria-label="Remove image"
                    >
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M6 6l12 12" />
                        <path d="M18 6L6 18" />
                      </svg>
                    </button>

                    {index === 0 && (
                      <div
                        className="
                          absolute
                          bottom-2
                          left-2
                          px-3
                          py-1
                          rounded-full
                          bg-white
                          text-xs
                          font-medium
                          shadow
                        "
                      >
                        Main photo
                      </div>
                    )}
                  </div>
                ))}

                {/* Add more */}
                <label
                  htmlFor="property-images"
                  className="
                    aspect-square
                    rounded-[14px]
                    border-2
                    border-dashed
                    border-neutral-300
                    flex
                    flex-col
                    items-center
                    justify-center
                    cursor-pointer
                    hover:bg-neutral-50
                    transition
                  "
                >
                  <div
                    className="
                      w-10
                      h-10
                      rounded-full
                      bg-neutral-100
                      flex
                      items-center
                      justify-center
                      mb-2
                    "
                  >
                    <span className="text-2xl font-light">
                      +
                    </span>
                  </div>

                  <span className="text-sm font-medium">
                    Add photos
                  </span>
                </label>

              </div>
            </section>
          )}

          {/* Photo guidance */}
          <div
            className="
              mt-8
              rounded-[16px]
              bg-neutral-50
              border
              border-neutral-200
              p-5
            "
          >
            <h3 className="font-medium text-[15px] mb-2">
              Photo tips
            </h3>

            <ul className="text-sm text-neutral-600 space-y-1.5">
              <li>• Show the exterior and main entrance.</li>
              <li>• Include bedrooms, bathrooms, and common areas.</li>
              <li>• Add photos of important amenities.</li>
              <li>• Use clear and well-lit photos.</li>
            </ul>
          </div>

        </div>

        {/* Bottom buttons */}
        <div className="mt-auto grid grid-cols-2 gap-3 px-4 pb-6 pt-10 sm:flex sm:items-center sm:justify-between sm:px-6 md:px-10">

          <button
            type="button"
            onClick={() => window.history.back()}
            className="
              w-full sm:w-[142px]
              h-[50px]
              rounded-full
              border
              border-black
              bg-white
              text-[20px]
              hover:bg-neutral-100
              transition
              cursor-pointer
            "
          >
            Back
          </button>

          <button
            type="button"
            disabled={images.length === 0}
            onClick={handleContinue}
            className={`
              w-full sm:w-[142px]
              h-[50px]
              rounded-full
              border
              border-black
              text-[20px]
              transition
              ${
                images.length > 0
                  ? 'bg-black text-white hover:bg-neutral-800 cursor-pointer'
                  : 'bg-neutral-200 text-black cursor-not-allowed'
              }
            `}
          >
            Continue
          </button>

        </div>

      </main>
    </div>
  );
}