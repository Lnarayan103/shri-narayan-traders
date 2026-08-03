/**
 * Soft-delete helpers — never hard-delete business records.
 * Records get isDeleted:true, deletedAt, deletedBy.
 * Admin Recycle Bin can restore within 30 days.
 */

const SOFT_DELETE_FIELDS = {
  isDeleted: true,
  deletedAt: new Date()
};

async function softDelete(collection, id, deletedBy = 'system') {
  return collection.update(
    { _id: id },
    { $set: { ...SOFT_DELETE_FIELDS, deletedBy } }
  );
}

async function restore(collection, id) {
  return collection.update(
    { _id: id },
    { $set: { isDeleted: false }, $unset: { deletedAt: true, deletedBy: true } }
  );
}

/** Query helper: exclude soft-deleted by default */
function notDeleted(extra = {}) {
  return { isDeleted: { $ne: true }, ...extra };
}

/** List trash items (deleted in last 30 days) */
async function listTrash(collection, limit = 100) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const items = await collection.find({ isDeleted: true }).sort({ deletedAt: -1 }).limit(limit);
  // Filter older than 30 days in memory for NeDB compatibility
  return items.filter(i => !i.deletedAt || new Date(i.deletedAt) >= cutoff);
}

/** Permanently remove items older than 30 days from trash */
async function purgeOldTrash(collection) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const all = await collection.find({ isDeleted: true });
  let removed = 0;
  for (const item of all) {
    if (item.deletedAt && new Date(item.deletedAt) < cutoff) {
      await collection.remove({ _id: item._id }, {});
      removed++;
    }
  }
  return removed;
}

module.exports = {
  softDelete,
  restore,
  notDeleted,
  listTrash,
  purgeOldTrash
};
