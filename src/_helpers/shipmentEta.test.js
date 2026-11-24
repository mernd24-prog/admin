import { shipmentTrackingActionValidationSchema } from "./validationSchemas";
import { replaceReturn, scheduleReturn } from "../Redux/adminCoreSlice";
import { axiosPrivate } from "./axiosProvider";

jest.mock("./axiosProvider", () => ({
  axiosPrivate: jest.fn(), axiosPublic: jest.fn(), axiosImage: jest.fn(),
}));

const validateEta = (values) => shipmentTrackingActionValidationSchema.validateAt(
  "expectedDeliveryAt", values,
);
const past = "2020-01-01T10:00";
const future = () => new Date(Date.now() + 86400000).toISOString();

test.each(["picked_up", "in_transit"])("%s retains a saved overdue ETA", async (status) => {
  await expect(validateEta({ status, expectedDeliveryAt: past, savedExpectedDeliveryAt: past }))
    .resolves.toBe(past);
});

test("new or revised estimates must be in the future", async () => {
  await expect(validateEta({ status: "in_transit", expectedDeliveryAt: past }))
    .rejects.toThrow("future");
  await expect(validateEta({ status: "in_transit", expectedDeliveryAt: past,
    savedExpectedDeliveryAt: "2020-01-02T10:00" }))
    .rejects.toThrow("future");
  await expect(validateEta({ status: "in_transit", expectedDeliveryAt: future() }))
    .resolves.toBeTruthy();
});

test("handover and transit still require an estimate when none was saved", async () => {
  for (const status of ["picked_up", "in_transit"]) {
    await expect(validateEta({ status, expectedDeliveryAt: "" }))
      .rejects.toThrow("required");
  }
});

test.each(["delivered", "pickup_failed", "failed"])("%s does not require an ETA", async (status) => {
  await expect(validateEta({ status, expectedDeliveryAt: "" })).resolves.toBe("");
});


test.each([
  ["return pickup", scheduleReturn], ["replacement", replaceReturn],
])("%s sends the arrival estimate through the API payload", async (label, thunk) => {
  axiosPrivate.mockResolvedValue({ data: { success: true } });
  const expectedDeliveryAt = future();
  const result = await thunk({ returnId: "return-a", action: "ship", expectedDeliveryAt })(
    jest.fn(), () => ({}), undefined,
  );
  expect(result.meta.requestStatus).toBe("fulfilled");
  expect(axiosPrivate).toHaveBeenLastCalledWith(expect.objectContaining({
    data: expect.objectContaining({ expectedDeliveryAt }),
  }));
});
