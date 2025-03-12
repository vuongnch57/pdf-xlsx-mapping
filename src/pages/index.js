import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [pdf, setPdf] = useState(null);
  const [xlsm, setXlsm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");

  const handleUpload = async () => {
    if (!pdf || !xlsm) return alert("Please upload both files");

    setLoading(true);
    const formData = new FormData();
    formData.append("pdf", pdf);
    formData.append("xlsm", xlsm);

    try {
      const res = await axios.post("/api/upload", formData, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      setDownloadUrl(url);
    } catch (error) {
      console.error("Error processing files:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container p-10 flex items-center justify-center">
      <div className="p-10 border border-gray-300 rounded flex flex-col items-center">
        <h1 className="text-center text-5xl">
          Tạo file PDF thông tin đơn hàng - SKUs
        </h1>
        <label className="mt-10">
          <span className="mr-4">Tải lên file PDF đơn hàng:</span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdf(e.target.files[0])}
            className="cursor-pointer"
          />
        </label>
        <label className="mt-5">
          <span className="mr-4">
            Tải lên file Excel thông tin đơn hàng và SKU:
          </span>
          <input
            type="file"
            accept=".xlsm,.xlsx"
            onChange={(e) => setXlsm(e.target.files[0])}
            className="cursor-pointer"
          />
        </label>
        <div className="flex items-center mt-10 gap-x-5">
          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            {loading ? "Đang xử lý..." : "Bắt đầu"}
          </button>
          <button
            onClick={() => {
              setPdf(null);
              setXlsm(null);
              setDownloadUrl("");
              document.querySelectorAll('input[type="file"]').forEach(input => (input.value = ""));
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Làm mới
          </button>
        </div>
        {downloadUrl && (
          <a
            href={downloadUrl}
            download="modified.pdf"
            className="mt-5 underline"
          >
            Tải về file PDF đã xử lý
          </a>
        )}
      </div>
    </div>
  );
}
