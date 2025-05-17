"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { Users, Zap, CheckCircle, Copy, Clock, Bitcoin, X } from "lucide-react";

// Add this custom breakpoint for extra small screens
// This will be used with the 'xs:' prefix in our Tailwind classes
const customBreakpoint = `
@media (min-width: 480px) {
  .xs\\:flex-row {
    flex-direction: row;
  }
  .xs\\:items-center {
    align-items: center;
  }
  .xs\\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .xs\\:gap-0 {
    gap: 0px;
  }
}
`;

interface Friend {
  id: number;
  name: string;
  avatar: string;
  lnAddress: string;
  pubkey: string;
}

interface Invoice {
  paymentRequest: string;
  paymentHash: string;
  amountSats: number;
  description: string;
  expiresAt: number;
}

interface PaymentType {
  paid: boolean;
  invoice: Invoice | null;
  preimage: string | null;
  paymentHash: string | null;
  timestamp: number | null;
  amount: number;
}

interface SelectedPayment {
  friendId: number;
  roundIndex: number;
  invoice: Invoice;
}

const roscaSettings = {
  monthlyAmount: 25000,
  totalPool: 100000,
  network: "mainnet",
};

// Add these utility functions before the main component
const formatSats = (sats: number): string => `${sats.toLocaleString()} sats`;
const formatUSD = (sats: number, btcPrice: number): string =>
  `$${((sats / 100_000_000) * btcPrice).toFixed(2)}`;

// Add this component before the main LightningRoscaPage component
const InvoiceModal = ({
  selectedPayment,
  onClose,
  onCopyInvoice,
  onMarkPaid,
  btcPrice,
}: {
  selectedPayment: SelectedPayment;
  onClose: () => void;
  onCopyInvoice: (text: string) => Promise<void>;
  onMarkPaid: () => void;
  btcPrice: number;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full space-y-3 sm:space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Lightning Invoice</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close invoice modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {formatSats(selectedPayment.invoice.amountSats)}
            </div>
            <div className="text-gray-500">
              {formatUSD(selectedPayment.invoice.amountSats, btcPrice)}
            </div>
          </div>

          <div className="bg-gray-100 p-3 rounded">
            <div className="text-xs text-gray-600 mb-1">Invoice</div>
            <div className="font-mono text-xs break-all">
              {selectedPayment.invoice.paymentRequest}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() =>
                onCopyInvoice(selectedPayment.invoice.paymentRequest)
              }
              className="flex-1 bg-orange-500 text-white py-2 rounded hover:bg-orange-600 flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Invoice
            </button>
            <button
              className="bg-gray-200 flex justify-center items-center text-gray-700 rounded hover:bg-gray-300"
              aria-label="Show QR code"
            >
              <QRCode
                className="w-10 h-10"
                value={selectedPayment.invoice.paymentRequest}
              />
            </button>
          </div>

          <button
            onClick={onMarkPaid}
            className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
          >
            Mark as Paid
          </button>

          <div className="text-xs text-gray-500 text-center">
            Expires in{" "}
            {Math.floor(
              (selectedPayment.invoice.expiresAt - Date.now()) / 60000
            )}{" "}
            minutes
          </div>
        </div>
      </div>
    </div>
  );
};

const LightningRoscaPage = () => {
  const [friends] = useState<Friend[]>([
    {
      id: 1,
      name: "Oyin",
      avatar: "👨‍🦲",
      lnAddress: "oyin112@gmail.com",
      pubkey: "02a1...",
    },
    {
      id: 2,
      name: "Jika",
      avatar: "👨",
      lnAddress: "jika101@gmail.com",
      pubkey: "03b2...",
    },
    {
      id: 3,
      name: "Victor",
      avatar: "👨‍🦲",
      lnAddress: "victor123@gmail.com",
      pubkey: "04c3...",
    },
    {
      id: 4,
      name: "Abdul",
      avatar: "👨",
      lnAddress: "abdul122@gmail.com",
      pubkey: "05d4...",
    },
  ]);

  const [lightningPayments, setLightningPayments] = useState<
    Record<number, PaymentType[]>
  >(() => {
    const initialPayments: Record<number, PaymentType[]> = {};
    friends.forEach((friend) => {
      initialPayments[friend.id] = Array(4)
        .fill(null)
        .map(() => ({
          paid: false,
          invoice: null,
          preimage: null,
          paymentHash: null,
          timestamp: null,
          amount: roscaSettings.monthlyAmount,
        }));
    });
    return initialPayments;
  });

  const [recipients] = useState<number[]>([1, 2, 3, 4]);
  const [btcPrice] = useState<number>(50000);
  const [selectedPayment, setSelectedPayment] =
    useState<SelectedPayment | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);

  const generateInvoice = async (
    amountSats: number,
    description: string
  ): Promise<Invoice> => {
    const mockInvoice = `lnbc${amountSats}u1p${Math.random()
      .toString(36)
      .substring(7)}`;
    const mockPaymentHash = Math.random().toString(36).substring(2);
    return {
      paymentRequest: mockInvoice,
      paymentHash: mockPaymentHash,
      amountSats,
      description,
      expiresAt: Date.now() + 3600000,
    };
  };

  const createPayment = async (
    friendId: number,
    roundIndex: number
  ): Promise<void> => {
    const recipient = getCurrentRecipient();
    const description = `Rosca Round ${roundIndex + 1} - Payment to ${
      recipient?.name ?? "Unknown"
    }`;
    try {
      const invoice = await generateInvoice(
        roscaSettings.monthlyAmount,
        description
      );
      setLightningPayments((prev) => ({
        ...prev,
        [friendId]: prev[friendId].map((payment, idx) =>
          idx === roundIndex ? { ...payment, invoice } : payment
        ),
      }));
      setSelectedPayment({ friendId, roundIndex, invoice });
      setShowInvoice(true);
    } catch (error) {
      console.error("Invoice creation failed", error);
      // Add user-facing error handling
      alert("Failed to create invoice. Please try again.");
    }
  };

  const markPaymentPaid = (friendId: number, roundIndex: number): void => {
    const preimage = Math.random().toString(36).substring(2);
    setLightningPayments((prev) => ({
      ...prev,
      [friendId]: prev[friendId].map((payment, idx) =>
        idx === roundIndex
          ? {
              ...payment,
              paid: true,
              preimage,
              timestamp: Date.now(),
            }
          : payment
      ),
    }));
  };

  const getCurrentRecipient = () => {
    return friends.find((f) => f.id === recipients[currentRound - 1]);
  };

  const getPaymentStatus = (friendId: number, round: number): PaymentType => {
    return lightningPayments[friendId][round];
  };

  const getRoundStatus = (roundIndex: number): boolean => {
    return friends.every(
      (friend) => lightningPayments[friend.id][roundIndex].paid
    );
  };

  const getTotalPaid = (roundIndex: number): number => {
    return friends.reduce(
      (total, friend) =>
        total +
        (lightningPayments[friend.id][roundIndex].paid
          ? roscaSettings.monthlyAmount
          : 0),
      0
    );
  };

  const getPersonalTotal = (friendId: number): number => {
    return lightningPayments[friendId].reduce(
      (total, payment) => total + (payment.paid ? payment.amount : 0),
      0
    );
  };

  const copyToClipboard = async (text: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <>
      <style jsx global>
        {customBreakpoint}
      </style>
      <main className="min-h-screen bg-orange-50 p-2 sm:p-4 md:p-6">
        <section className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500 rounded-full">
                <Zap className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Lightning Rosca
                </h1>
                <p className="text-gray-600 text-sm">
                  {friends.length} friends •
                  {formatSats(roscaSettings.monthlyAmount)}/month
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Bitcoin className="w-6 h-6 text-orange-500" />
              <div>
                <div className="text-xl font-bold text-orange-600">
                  {formatSats(roscaSettings.totalPool)}
                </div>
                <div className="text-sm text-gray-500">
                  {formatUSD(roscaSettings.totalPool, btcPrice)}
                </div>
              </div>
            </div>
          </header>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span className="font-semibold text-blue-900 text-sm sm:text-base">
                Round {currentRound} Recipient
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl">
                {getCurrentRecipient()?.avatar}
              </span>
              <div>
                <p className="font-bold text-base sm:text-lg text-blue-900">
                  {getCurrentRecipient()?.name}
                </p>
                <p className="text-xs sm:text-sm text-blue-600">
                  {getCurrentRecipient()?.lnAddress}
                </p>
              </div>
              <div className="mt-2 sm:mt-0 sm:ml-auto">
                <div className="text-base sm:text-lg font-bold text-blue-900">
                  {formatSats(getTotalPaid(currentRound - 1))} /{" "}
                  {formatSats(roscaSettings.totalPool)}
                </div>
                <div className="text-xs sm:text-sm text-blue-600">
                  {formatUSD(getTotalPaid(currentRound - 1), btcPrice)} /{" "}
                  {formatUSD(roscaSettings.totalPool, btcPrice)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 xs:gap-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">
              Round {currentRound} of 4
            </h2>
            <div className="flex gap-2">
              {currentRound > 1 && (
                <button
                  onClick={() => setCurrentRound((prev) => prev - 1)}
                  className="bg-gray-100 px-2 sm:px-3 py-1 text-sm rounded hover:bg-gray-200"
                  aria-label="Previous round"
                >
                  Previous
                </button>
              )}
              {currentRound < 4 && (
                <button
                  onClick={() => setCurrentRound((prev) => prev + 1)}
                  className="bg-orange-500 text-white px-2 sm:px-3 py-1 text-sm rounded hover:bg-orange-600"
                >
                  Next
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
            {friends.map((friend) => {
              const payment = getPaymentStatus(friend.id, currentRound - 1);
              const isRecipient = friend.id === getCurrentRecipient()?.id;

              return (
                <div
                  key={friend.id}
                  className={`border p-3 sm:p-4 rounded-lg space-y-2 ${
                    payment.paid
                      ? "bg-green-50 border-green-300"
                      : payment.invoice
                      ? "bg-orange-50 border-orange-300"
                      : "bg-gray-50 border-gray-200"
                  } ${isRecipient ? "ring-2 ring-yellow-400" : ""}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      <span className="text-xl sm:text-2xl">
                        {friend.avatar}
                      </span>
                      <div>
                        <p className="font-semibold text-sm sm:text-base">
                          {friend.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[100px] sm:max-w-full">
                          {friend.lnAddress}
                        </p>
                      </div>
                    </div>

                    {payment.paid ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-medium">
                          Paid
                        </span>
                      </div>
                    ) : payment.invoice ? (
                      <div className="flex items-center gap-1 text-orange-600">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-medium">
                          Pending
                        </span>
                      </div>
                    ) : !isRecipient ? (
                      <button
                        onClick={() =>
                          createPayment(friend.id, currentRound - 1)
                        }
                        className="bg-orange-500 text-white px-2 sm:px-3 py-1 text-xs sm:text-sm rounded hover:bg-orange-600"
                      >
                        Pay
                      </button>
                    ) : (
                      <div className="text-yellow-600 font-medium text-xs sm:text-sm">
                        Recipient
                      </div>
                    )}
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold">
                        {formatSats(roscaSettings.monthlyAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">USD:</span>
                      <span className="font-semibold">
                        {formatUSD(roscaSettings.monthlyAmount, btcPrice)}
                      </span>
                    </div>
                    {payment.timestamp && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid at:</span>
                        <span className="text-xs">
                          {new Date(payment.timestamp).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {payment.invoice && !payment.paid && (
                    <div className="pt-2 space-y-2">
                      <button
                        onClick={() =>
                          markPaymentPaid(friend.id, currentRound - 1)
                        }
                        className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
                      >
                        Mark as Paid (Demo)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className={`p-3 sm:p-4 rounded-lg border ${
                  getRoundStatus(i)
                    ? "bg-green-50 border-green-300"
                    : currentRound - 1 === i
                    ? "bg-blue-50 border-blue-300"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="text-center">
                  <div className="text-sm sm:text-base font-bold">
                    Round {i + 1}
                  </div>
                  <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">
                    {friends.find((f) => f.id === recipients[i])?.avatar}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold">
                    {friends.find((f) => f.id === recipients[i])?.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatSats(getTotalPaid(i))} /{" "}
                    {formatSats(roscaSettings.totalPool)}
                  </div>
                  {getRoundStatus(i) && (
                    <div className="flex justify-center mt-1 sm:mt-2">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <footer className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">
              Personal Summary
            </h3>
            <div className="space-y-1 sm:space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center gap-2">
                    <span>{friend.avatar}</span>
                    <span>{friend.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatSats(getPersonalTotal(friend.id))}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatUSD(getPersonalTotal(friend.id), btcPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </footer>
          {showInvoice && selectedPayment && (
            <InvoiceModal
              selectedPayment={selectedPayment}
              onClose={() => setShowInvoice(false)}
              onCopyInvoice={copyToClipboard}
              onMarkPaid={() => {
                markPaymentPaid(
                  selectedPayment.friendId,
                  selectedPayment.roundIndex
                );
                setShowInvoice(false);
              }}
              btcPrice={btcPrice}
            />
          )}
        </section>
      </main>
    </>
  );
};

export default LightningRoscaPage;
