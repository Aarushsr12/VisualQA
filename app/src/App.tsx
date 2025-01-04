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
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Visual Regression Testing</h1>
      </header>

      <main className="dashboard-content">
        <section className="image-upload">
          <div className="upload-box">
            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "baseline")} />
            <label>Upload Baseline Image</label>
          </div>

          <div className="upload-box">
            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "current")} />
            <label>Upload Current Image</label>
          </div>
          <button onClick={handleCompare} className="compare-button">
            Compare Images
          </button>
        </section>

        {mismatchPercentage !== null && (
          <section className="results">
            <h2>Comparison Results</h2>
            <p><strong>Mismatch Percentage:</strong> {mismatchPercentage}%</p>
            {diffImage && <img src={diffImage} alt="Diff" />}
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
