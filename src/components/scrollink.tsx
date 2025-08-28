import { useNavigate } from "react-router-dom";

const handleScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
        const y = el.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
    }
};

const ProjectsButton = () => {
    const navigate = useNavigate();

    const onClick = () => {
        if (window.location.pathname !== "/") {
            navigate("/", { replace: false });
            setTimeout(() => handleScroll("projects"), 50); // wait for Home to mount
        } else {
            handleScroll("projects");
        }
    };

    return (
        <button onClick={onClick} className="hover:text-gray-400">
            Projects
        </button>
    );
};

export default ProjectsButton;