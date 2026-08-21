import { useState, useEffect } from "react";
import url from '../host/host';
import Image from "next/image";

export default function FaceCheck() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle file selection and create preview
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setError(null);
    setResult(null);

    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      console.log("Selected file:", {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
      });
    } else {
      setPreviewUrl(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Iltimos, rasm tanlang");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("photo", file);

    try {
      console.log("Sending request to /face-check with file:", file.name);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log("Request aborted due to timeout (60s)");
      }, 60000); // Increased to 60s

      const response = await fetch(`${url}/api/face-check`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server xatosi: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      console.log("Response received:", data);
      setResult(data);
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.name === "AbortError") {
        setError("Xato: So'rov 60 soniyadan ko'p vaqt oldi. Server sekin ishlamoqda yoki ulanmagan.");
      } else {
        setError("Xato yuz berdi: " + (err.message || "Noma'lum xato"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Yuzni Tekshirish</h1>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="mb-4">
            <label htmlFor="photo" className="block text-sm font-medium text-gray-700">
              Rasm tanlang (PNG yoki JPEG)
            </label>
            <input
              type="file"
              id="photo"
              name="photo"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {previewUrl && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">Tanlangan rasm:</p>
              <Image
                src={previewUrl}
                alt="Preview"
                width={200}
                height={200}
                className="mt-2 rounded object-cover"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? "Yuklanmoqda..." : "Tekshirish"}
          </button>
        </form>
        {error && <p className="mt-4 text-red-500">{error}</p>}
        {result && (
          <div className="mt-6 p-4 border rounded">
            {result.success ? (
              <div className="text-green-600">
                <p className="font-semibold">Muvaffaqiyatli!</p>
                <p>Xodim ismi: {result.data?.name || "Noma'lum"}</p>
                <p>ID: {result.data?.id || "N/A"}</p>
                <p>Rasm: {result.data?.image || "N/A"}</p>
              </div>
            ) : (
              <p className="text-red-500">{result.message || "Xato yuz berdi"}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}