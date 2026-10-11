module.exports = {
    Button: ({ children, ...props }) => <button {...props}>{children}</button>,
    ButtonGroup: ({ children }) => <div>{children}</div>,
    Dropdown: ({ children }) => <div>{children}</div>,
    Label: ({ children }) => <label>{children}</label>,
    Switch: ({ children, isSelected, onChange }) => (
        <label>
            <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onChange?.(e.target.checked)}
            />
            {children}
        </label>
    ),
    SwitchControl: ({ children }) => <>{children}</>,
    SwitchThumb: () => null,
};
