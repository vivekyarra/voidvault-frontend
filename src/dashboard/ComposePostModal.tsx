import { type FormEvent, useEffect, useRef, useState } from "react";
import { requestJson } from "../api";
import { ImageIcon, XIcon } from "./icons";
import { uploadPostImage } from "./mediaUpload";

export function ComposePostModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [channel, setChannel] = useState("general");
  const [content, setContent] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isOpen, onClose]);

  function resetState() {
    setChannel("general");
    setContent("");
    setUploadStatus("");
    setUploadProgress(0);
    setImagePreviewUrl(null);
    setUploadedImageUrl(null);
    setIsUploading(false);
    setIsPosting(false);
    setStatus("");
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setImagePreviewUrl(localPreview);
    setUploadedImageUrl(null);
    setUploadStatus("Uploading image...");
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedUrl = await uploadPostImage(file, setUploadProgress);
      setUploadedImageUrl(uploadedUrl);
      setUploadStatus("Image upload completed.");
      setUploadProgress(100);
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Image upload failed");
      setUploadedImageUrl(null);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isUploading) {
      setStatus("Please wait for image upload to finish.");
      return;
    }

    setIsPosting(true);
    setStatus("");

    try {
      const payload: Record<string, unknown> = {
        channel,
        content,
      };

      if (uploadedImageUrl) {
        payload.image_url = uploadedImageUrl;
      }

      await requestJson<{ post: { id: string } }>("/post", {
        method: "POST",
        body: payload,
      });

      await onCreated();
      resetState();
      onClose();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to publish post");
    } finally {
      setIsPosting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Create post"
        className="modal-card"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="panel-header">
          <h2>Create Post</h2>
          <button aria-label="Close" className="modal-close-btn" type="button" onClick={onClose}>
            <XIcon />
          </button>
        </header>

        <form className="composer" onSubmit={handleSubmit}>
          <input
            maxLength={32}
            placeholder="channel"
            required
            type="text"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          />
          <textarea
            maxLength={500}
            placeholder="What's happening?"
            required
            rows={5}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />

          <div className="composer-toolbar">
            <button
              aria-label="Attach image"
              className="icon-only-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon />
            </button>
            <input
              accept="image/*"
              hidden
              ref={fileInputRef}
              type="file"
              onChange={(event) => void handleFileSelected(event)}
            />
            <button className="primary-btn" disabled={isPosting || isUploading} type="submit">
              {isPosting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>

        {imagePreviewUrl ? (
          <img alt="Selected preview" className="content-image" src={imagePreviewUrl} />
        ) : null}

        {isUploading ? (
          <p className="panel-status">Uploading image: {uploadProgress}%</p>
        ) : null}
        {uploadStatus ? <p className="panel-status">{uploadStatus}</p> : null}
        {status ? <p className="panel-status">{status}</p> : null}
      </section>
    </div>
  );
}
