import { useState, useEffect } from "react";
import { Plus, Edit, X } from "lucide-react";
import { fetchAdminCategories, createAdminCategory, editAdminCategory } from "../../services/adminService";

export default function AdminCategoriesView() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchAdminCategories();
        if (!ignore) setCategories(data.categories || []);
      } catch (err) {
        console.error("Error loading categories:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  async function loadCategories() {
    try {
      const data = await fetchAdminCategories();
      setCategories(data.categories || []);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  }

  function handleOpenAdd() {
    setName("");
    setDescription("");
    setModalMode("add");
  }

  function handleOpenEdit(cat) {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setModalMode("edit");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setMessage("");
    try {
      if (modalMode === "add") {
        const res = await createAdminCategory({ name, description });
        setMessage(res.message);
      } else if (modalMode === "edit" && editingCategory) {
        const res = await editAdminCategory(editingCategory.id, { name, description });
        setMessage(res.message);
      }
      setModalMode(null);
      loadCategories();
    } catch (err) {
      alert(err.message || "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Artist Categories</h1>
          <p className="admin-page-subtitle">
            Manage performance categories, browse active talent rosters, and configure platform genres.
          </p>
        </div>

        <div className="admin-page-actions">
          <button type="button" className="admin-btn admin-btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: "10px 16px", background: "rgba(16, 185, 129, 0.15)", color: "var(--admin-status-success)", borderRadius: "6px", marginBottom: "16px", fontSize: "0.94rem" }}>
          {message}
        </div>
      )}

      {/* Categories Grid */}
      <div className="admin-panel-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category Name</th>
                <th>Description</th>
                <th>Active Artists</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "36px" }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 10px" }} />
                    <span>Loading categories...</span>
                  </td>
                </tr>
              ) : categories.length > 0 ? (
                categories.map((c) => (
                  <tr key={c.id}>
                    <td className="strong">#{c.id}</td>
                    <td className="strong" style={{ color: "var(--admin-accent)" }}>
                      {c.name}
                    </td>
                    <td>{c.description || "No description provided."}</td>
                    <td>
                      <span className="admin-action-badge badge-orange">
                        {c.artists_count} artists
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={() => handleOpenEdit(c)}
                      >
                        <Edit size={13} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "36px" }}>
                    No categories configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {modalMode && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                {modalMode === "add" ? "Create New Category" : `Edit Category: ${editingCategory?.name}`}
              </h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setModalMode(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Category Name</label>
                  <input
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. Instrumental & Orchestra, Stand-up Comedy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Description</label>
                  <textarea
                    className="admin-form-textarea"
                    placeholder="Describe this category of performing talent..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setModalMode(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={submitting}
                >
                  {modalMode === "add" ? "Create Category" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
