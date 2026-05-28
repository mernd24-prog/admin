/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import TableData from "../../../components/Atoms/TableData/TableData";
import AddEditTransactionModal from "./components/AddEditTransactionModal";
import {
  createContentPage,
  getContentPages,
} from "../../../Redux/adminCoreSlice";
import { getAllUserList } from "../../../Redux/userManagementSlice";

const PAGE_TYPE = "user_transaction";

const extractList = (payload) => {
  const root = payload?.data?.data || payload?.data || {};
  return root.list || root.items || root.rows || [];
};

const formatCurrency = (value) => {
  const numeric = Number(value || 0);
  return `$${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const UsersTransactions = () => {
  const dispatch = useDispatch();
  const adminCoreSelector = useSelector((state) => state.adminCore);

  const [apiRes, setApiRes] = useState([]);
  const [users, setUsers] = useState([]);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  const loadTransactions = async () => {
    try {
      const response = await dispatch(
        getContentPages({ pageType: PAGE_TYPE, limit: 100 }),
      ).unwrap();
      setApiRes(extractList(response));
    } catch (error) {
      toast.error(error?.message || "Failed to load transactions");
    }
  };

  const loadUsers = async () => {
    try {
      const response = await dispatch(
        getAllUserList({ page: 1, limit: 100 }),
      ).unwrap();
      setUsers(extractList(response));
    } catch (error) {
      setUsers([]);
    }
  };

  useEffect(() => {
    loadTransactions();
    loadUsers();
  }, []);

  const loading = adminCoreSelector?.contentPagesData?.loading;

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        id: user?._id,
        name: user?.full_name || user?.name || user?.email || "User",
        email: user?.email || "",
      })),
    [users],
  );

  const tableHeadings = [
    "Transaction ID",
    "User's Name",
    "Date",
    "Credit",
    "Debit",
    "Description",
    "Status",
  ];

  const tableRows = apiRes?.map((item) => {
    const metadata = item?.metadata || {};
    const amount = Number(metadata.amount || 0);
    const isCredit = String(metadata.type || "").toLowerCase() === "credit";
    const timestamp = item?.publishedAt || item?.updatedAt || item?.createdAt;

    return [
      metadata.transactionId || item?.slug || "-",
      metadata.userLabel || item?.title || "-",
      timestamp ? new Date(timestamp).toLocaleString() : "-",
      isCredit ? formatCurrency(amount) : "$0.00",
      !isCredit ? formatCurrency(amount) : "$0.00",
      metadata.description || "-",
      <span
        className="p-1 bg-sky-100 text-sky-600"
        key={`status-${item?._id || item?.slug}`}
      >
        {metadata.status || "Transaction Completed"}
      </span>,
    ];
  });

  const handleCreateTransaction = async (data) => {
    try {
      const selectedUser = userOptions.find(
        (u) => `${u.name} (${u.email})` === data.userId,
      );
      const now = Date.now();
      const txId = `TN-${String(now).slice(-8)}`;

      await dispatch(
        createContentPage({
          slug: `transaction-${now}`,
          title: selectedUser?.name || data.userId,
          pageType: PAGE_TYPE,
          language: "en",
          published: true,
          publishedAt: new Date().toISOString(),
          metadata: {
            transactionId: txId,
            userId: selectedUser?.id || null,
            userLabel: selectedUser
              ? `${selectedUser.name} (${selectedUser.email})`
              : data.userId,
            type: String(data.type || "").toLowerCase(),
            amount: Number(data.amount || 0),
            description: data.description,
            status: "Transaction Completed",
          },
        }),
      ).unwrap();

      toast.success("Transaction added successfully");
      await loadTransactions();
    } catch (error) {
      toast.error(error?.message || "Failed to add transaction");
    }
  };

  return (
    <>
      <div className="p-6 overflow-hidden overflow-x-auto overflow-y-auto">
        <div className=" overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]">
          <TableData
            Heading="Users Transactions"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder="Search by transaction..."
            showFilter={false}
            showSummary={false}
            showAddButton={true}
            addButtonLabel="Add"
            isLoading={loading}
            onClickFunction={() => {
              setIsTransactionModalOpen(true);
            }}
          />
        </div>
      </div>

      <AddEditTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSubmit={handleCreateTransaction}
        users={userOptions}
      />
    </>
  );
};

export default UsersTransactions;
