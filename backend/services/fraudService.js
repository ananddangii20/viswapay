exports.checkFraud = async (amount) => {

  if (amount > 50000)
    return { risk: "HIGH" };

  return { risk: "LOW" };
};