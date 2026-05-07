import { Link } from "react-router-dom";

const Breadcrumb = ({ isEditMode }) => (
  <nav className='py-4'>
    <ol className="flex items-center text-sm text-gray-500">
      <li className="transition-colors hover:text-blue-600">
        <Link to="/">Home</Link>
      </li>
      <li className="mx-2">/</li>
      <li className="transition-colors hover:text-blue-600">
        <Link to="/app/product-catalog">Product Catalog</Link>
      </li>
      <li className="mx-2">/</li>
      <li className="font-medium text-blue-600">
        {isEditMode ? "Edit" : 'Add'} Product
      </li>
    </ol>
  </nav>
);
export default Breadcrumb;