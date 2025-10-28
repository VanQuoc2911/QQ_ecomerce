export async function getNextId(Model) {
  const doc = await Model.findOne({}).sort({ id: -1 }).select("id").lean();
  return doc && doc.id ? doc.id + 1 : 1;
}
