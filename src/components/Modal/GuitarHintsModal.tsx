import { Dialog, Transition } from "@headlessui/react";
import Image from "next/image";
import { Fragment, ReactNode, useState } from "react";

const GuitarHintsModal = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  return (
    <>
      <div className="">
        <button
          type="button"
          onClick={openModal}
          className="rounded-md bg-black font-Lora bg-opacity-20 px-4 py-2 text-2xl font-medium text-[#1BD79E] hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
        >
          Hints
        </button>
      </div>

      <Transition appear show={isOpen}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-10" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-2xl font-medium leading-6 text-gray-900 text-center font-Lora"
                  >
                    Here is how you navigate the guitar
                  </Dialog.Title>
                  <div className="mt-2">
                    <span className="mr-4 font-Lora text-xl text-black  block border-b-2 border-[#E5EFE1] pb-2 mt-2">
                      Fingers and Strings{" "}
                    </span>
                    <div className="flex items-center justify-start px-3 py-2">
                      <div
                        className={`mr-3 h-[27px] w-[27px] rounded-full bg-[#1BD79E] flex items-center justify-center font-Lora`}
                      >
                        1
                      </div>
                      <span className="font-Lora text-xl text-black">
                        Pressed fingers
                      </span>
                    </div>
                    <span className="font-Lora text-sm text-black">
                      In this case you can use the index finger of your left
                      hand to press the on the guitar
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-start px-3 py-2">
                    <Image
                      src="/hand.png"
                      alt="finger-numbers"
                      width={135}
                      height={180}
                    />
                    <span className="mr-4 font-Lora text-lg text-black">
                      Left hand
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-start px-3 py-2">
                      <div
                        className={`mr-3 h-[27px] w-[27px] rounded-full bg-[#1BD79E] flex items-center justify-center font-Lora`}
                      >
                        0
                      </div>
                      <span className="font-Lora text-xl text-black">
                        Open String
                      </span>
                    </div>
                    <span className="font-Lora text-sm text-black">
                      In this case 0 is open string
                    </span>
                  </div>
                  <span className="mr-4 font-Lora text-xl text-black  block border-b-2 border-[#E5EFE1] pb-2 mt-2">
                    Tuning{" "}
                  </span>
                  <span className="mr-4 font-Lora text-lg text-black w-[25%]">
                    Standard tuning: E2,A2,D3,G3,B3,E4
                  </span>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-[#1bd79f85] px-4 py-2 text-sm font-medium text-black hover:bg-[#1BD79E] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 font-Lora"
                      onClick={closeModal}
                    >
                      Got it, thanks!
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default GuitarHintsModal;
