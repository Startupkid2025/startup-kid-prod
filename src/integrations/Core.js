export const InvokeLLM = async ({ prompt, response_json_schema } = {}) => {
  console.warn("InvokeLLM: stub - no Base44 backend connected");
  return response_json_schema ? {} : "";
};
