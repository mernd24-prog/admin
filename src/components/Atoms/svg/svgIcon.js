// components/SvgIcon.js
const SvgIcon = ({ name, className = '' }) => {
  return (
    <svg className={`svg ${className}`} width="18" height="18">
      <use xlinkHref={`/admin/images/retina/sprite-actions.svg?t=1736965800#${name}`} />
    </svg>
  );
};

export default SvgIcon;