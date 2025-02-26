export const all_svgs = `
    <!-- Uguale -->
    <line id="Uguale" x1="10" y1="50" x2="90" y2="50" stroke="black" stroke-width="3" />
    
    <!-- Deb in crescita -->
    <path id="Deb_in_crescita" d="M10,80 Q50,20 90,80" stroke="green" stroke-width="3" fill="none" marker-end="url(#arrowhead)" />
    
    <!-- Deb_in_decrescita -->
    <path id="Deb_in_decrescita" d="M10,20 Q50,80 90,20" stroke="red" stroke-width="3" fill="none" marker-end="url(#arrowhead)" />
    
    <!-- Debolmente_in_crescita -->
    <path id="Debolmente_in_crescita" d="M10,70 Q50,40 90,70" stroke="lightgreen" stroke-width="3" fill="none" marker-end="url(#arrowhead)" />
    
    <!-- Fortemente_in_crescita -->
    <path id="Fortemente_in_crescita" d="M10,90 Q50,10 90,90" stroke="darkgreen" stroke-width="3" fill="none" marker-end="url(#arrowhead)" />
    
    <!-- Altalenante_in_decrescita -->
    <path id="Altalenante_in_decrescita" d="M10,30 Q30,80 50,30 Q70,-10 90,30" stroke="orange" stroke-width="3" fill="none" marker-end="url(#arrowhead)" />
    
    <!-- Fortemente_in_decrescita -->
    <path id="Fortemente_in_decrescita" d="M10,10 Q50,90 90,10" stroke="darkred" stroke-width="3" fill="none" marker-end="url(#arrowhead)" />
    
    <!-- Debolmente_in_decrescita -->
    <path id="Debolmente_in_decrescita" d="M10,30 Q50,60 90,30" stroke="pink" stroke-width="3" fill="none" marker-end="url(#arrowhead)" />
    
    <!-- Altalenante_in_crescita -->
    <path id="Altalenante_in_crescita" d="M10,70 Q30,20 50,70 Q70,120 90,70" stroke="blue" stroke-width="3" fill="none" marker-end="url(#arrowhead)" />
    
    <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="black" />
        </marker>
    </defs>`