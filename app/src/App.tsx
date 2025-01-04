import React, { useState } from "react";
import resemble from "resemblejs";

const App: React.FC = () => {
  const [baselineImage, setBaselineImage] = useState<File | null>(null);
  const [currentImage, setCurrentImage] = useState<File | null>(null);
  const [diffImage, setDiffImage] = useState<string | null>(null);
  const [mismatchPercentage, setMismatchPercentage] = useState<number | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: "baseline" | "current") => {
    const file = event.target.files?.[0];
    if (type === "baseline") setBaselineImage(file || null);
    if (type === "current") setCurrentImage(file || null);
  };

  const handleCompare = async () => {
    if (!baselineImage || !currentImage) {
      alert("Please upload both images to compare!");
      return;
    }

    const baselineReader = new FileReader();
    const currentReader = new FileReader();

    baselineReader.onload = () => {
      currentReader.onload = () => {
        resemble(baselineReader.result as string)
          .compareTo(currentReader.result as string)
          .onComplete((data) => {
            setDiffImage(data.getImageDataUrl());
            setMismatchPercentage(data.misMatchPercentage);
          });
      };
      currentReader.readAsDataURL(currentImage);
    };
    baselineReader.readAsDataURL(baselineImage);
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Visual Regression testing</h1>

      <div>
        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "baseline")} />
        <label> Upload Baseline Image</label>
      </div>

      <div>
        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "current")} />
        <label> Upload Current Image</label>
      </div>

      <button
        onClick={handleCompare}
        style={{
          padding: "10px 20px",
          marginTop: "20px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Compare Images
      </button>

      {mismatchPercentage !== null && (
        <div style={{ marginTop: "20px" }}>
          <h2>Comparison Results</h2>
          <p>Mismatch Percentage: {mismatchPercentage}%</p>
          {diffImage && <img src={diffImage} alt="Diff" style={{ maxWidth: "400px", border: "1px solid #ddd" }} />}
        </div>
      )}
    </div>
  );
};

export default App;
